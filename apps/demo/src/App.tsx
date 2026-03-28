import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { isSelfHealEnabledFromSearch, type StatusUpdate } from '@ralphthon/self-heal-runtime';

import NoteForm from './features/note/components/NoteForm';
import HealingStatus from './features/note/components/HealingStatus';
import { MANUAL_BREAK_EDIT, createNoteAction as defaultCreateNoteAction } from './features/note/actions/createNoteAction';
import type { CreateNoteAction, Note } from './features/note/types';
import { buildCreateNoteHint, CREATE_NOTE_ACTION_ID } from './self-heal/actionHints';
import { appendOperatorLog, formatDetails, type OperatorLogEntry } from './self-heal/operatorLog';
import { createDemoRuntimeClient, type CreateNotePatchRequest } from './self-heal/runtimeClient';

interface AppProps {
  createNoteAction?: CreateNoteAction;
  requestPatch?: CreateNotePatchRequest;
  initialUrlSearch?: string;
}

function statusMessage(status: StatusUpdate | null): string | null {
  if (!status) {
    return null;
  }

  if (status.status === 'healing' || status.status === 'retrying') {
    return 'Saving your note…';
  }

  return null;
}

export default function App({
  createNoteAction = defaultCreateNoteAction,
  requestPatch,
  initialUrlSearch
}: AppProps) {
  const enabled = isSelfHealEnabledFromSearch(initialUrlSearch ?? window.location.search);
  const [draft, setDraft] = useState('');
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [operatorLog, setOperatorLog] = useState<OperatorLogEntry[]>([]);

  const pushOperatorLog = useCallback((level: OperatorLogEntry['level'], message: string, details?: unknown) => {
    setOperatorLog((entries) =>
      appendOperatorLog(entries, {
        level,
        message,
        details: formatDetails(details)
      })
    );
  }, []);

  const runtime = useMemo(
    () =>
      createDemoRuntimeClient({
        enabled,
        requestPatch,
        onStatusChange: (update) => {
          setCurrentStatus(update);
          if (update.status === 'healing' || update.status === 'retrying') {
            setFailureMessage(null);
          }
          if (update.status === 'retrying') {
            pushOperatorLog('info', `Retrying ${update.actionId} once.`, 'Automatic retry is limited to a single attempt.');
          }
        },
        onPatchApplied: (patch) => {
          pushOperatorLog('info', `Installed transient hotfix for ${patch.actionId}.`, patch.rationale ?? 'Patch installed without rationale.');
        },
        onDiagnostic: (message, details) => {
          pushOperatorLog('error', message, details);
        }
      }),
    [enabled, pushOperatorLog, requestPatch]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setFailureMessage(null);
      setCurrentStatus(null);

      try {
        const result = await runtime.executeAction({
          actionId: CREATE_NOTE_ACTION_ID,
          input: { text: draft },
          action: createNoteAction,
          hint: buildCreateNoteHint(createNoteAction.toString()),
          sourceSnippet: createNoteAction.toString()
        });

        setNotes((current) => [result.note, ...current]);
        setDraft('');
        setCurrentStatus(null);
      } catch (error) {
        setCurrentStatus(null);
        setFailureMessage('We couldn’t save that note just now.');
        pushOperatorLog('error', 'Save note failed.', error);
      }
    },
    [createNoteAction, draft, pushOperatorLog, runtime]
  );

  return (
    <main className="demo-shell">
      <section className="demo-card">
        <div className="eyebrow">Ralphthon demo</div>
        <h1>Save a note without breaking the moment.</h1>
        <p className="subhead">
          A regular note-taking app with one delightful interaction. When recovery is enabled, the runtime stays out of the way and quietly keeps the save flow moving.
        </p>

        <NoteForm busy={currentStatus?.status === 'healing' || currentStatus?.status === 'retrying'} value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        <HealingStatus kind="healing" message={statusMessage(currentStatus)} />
        <HealingStatus kind="error" message={failureMessage} />

        <div className="notes-grid" aria-live="polite">
          {notes.length === 0 ? (
            <article className="note-card">
              <strong>Nothing saved yet</strong>
              <span>Submit a quick note and your latest save will appear here.</span>
            </article>
          ) : null}

          {notes.map((note) => (
            <article key={note.id} className="note-card">
              <strong>Saved note</strong>
              <span>{note.text}</span>
            </article>
          ))}
        </div>

        <details className="operator-panel">
          <summary>Operator log</summary>
          <div className="operator-log">
            <div className="operator-log-item info">
              <strong>Recovery mode</strong>
              <small>{enabled ? 'Enabled via ?selfHeal=1' : 'Disabled — healthy and broken-path demos run here.'}</small>
            </div>
            {operatorLog.length === 0 ? (
              <div className="operator-log-item info">
                <strong>No diagnostics yet</strong>
                <small>
                  Credential issues, hotfix installs, retry failures, and the operator demo cues live here. Manual break: {MANUAL_BREAK_EDIT}.
                </small>
              </div>
            ) : null}
            {operatorLog.map((entry) => (
              <div key={entry.id} className={`operator-log-item ${entry.level}`}>
                <strong>{entry.message}</strong>
                {entry.details ? <small>{entry.details}</small> : null}
              </div>
            ))}
          </div>
        </details>
      </section>
    </main>
  );
}
