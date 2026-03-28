import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { isSelfHealEnabledFromSearch, type StatusUpdate } from '@ralphthon/self-heal-runtime';

import { appendOperatorLog, formatDetails, type OperatorLogEntry } from './operatorLog';
import { discoverDemoActions, type DemoActionOverrides } from './discoverActions';
import { createDemoActionCatalog, type DemoActionCatalog, type DemoPatchRequest } from './runtimeClient';

interface DemoSelfHealContextValue {
  actions: DemoActionCatalog;
  currentStatus: StatusUpdate | null;
  operatorLog: OperatorLogEntry[];
  enabled: boolean;
  reportOperatorError: (message: string, details?: unknown) => void;
}

interface DemoSelfHealProviderProps {
  children: ReactNode;
  initialUrlSearch?: string;
  requestPatch?: DemoPatchRequest;
  actionOverrides?: DemoActionOverrides;
}

const DemoSelfHealContext = createContext<DemoSelfHealContextValue | null>(null);

export function DemoSelfHealProvider({
  children,
  initialUrlSearch,
  requestPatch,
  actionOverrides
}: DemoSelfHealProviderProps) {
  const enabled = isSelfHealEnabledFromSearch(initialUrlSearch ?? window.location.search);
  const [currentStatus, setCurrentStatus] = useState<StatusUpdate | null>(null);
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

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      pushOperatorLog('error', 'Unhandled browser error.', event.error ?? event.message);
    };
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      pushOperatorLog('error', 'Unhandled promise rejection.', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [pushOperatorLog]);

  useEffect(() => {
    if (requestPatch || import.meta.env.MODE === 'test') {
      return;
    }

    let cancelled = false;

    void fetch('/api/self-heal/status')
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Status request failed with ${response.status}.`);
        }

        const payload = (await response.json()) as { mode?: string; model?: string | null; ready?: boolean };
        if (cancelled) {
          return;
        }

        const statusLine =
          payload.mode === 'openai'
            ? `Live provider ready (${payload.model ?? 'default model'}).`
            : 'Stub provider active.';

        pushOperatorLog('info', 'Self-heal provider status.', statusLine);

        if (payload.mode === 'openai' && payload.ready === false) {
          pushOperatorLog('error', 'Live provider is not ready.', 'OPENAI_API_KEY is missing or invalid for this server process.');
        }
      })
      .catch((error) => {
        if (!cancelled) {
          pushOperatorLog('error', 'Unable to load self-heal provider status.', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pushOperatorLog, requestPatch]);

  const actions = useMemo(
    () =>
      createDemoActionCatalog(
        {
          enabled,
          requestPatch,
          onStatusChange: (update) => {
            setCurrentStatus(update);
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
        },
        discoverDemoActions(actionOverrides)
      ),
    [actionOverrides, enabled, pushOperatorLog, requestPatch]
  );

  const value = useMemo<DemoSelfHealContextValue>(
    () => ({
      actions,
      currentStatus,
      operatorLog,
      enabled,
      reportOperatorError: (message, details) => {
        pushOperatorLog('error', message, details);
      }
    }),
    [actions, currentStatus, enabled, operatorLog, pushOperatorLog]
  );

  return <DemoSelfHealContext.Provider value={value}>{children}</DemoSelfHealContext.Provider>;
}

export function useDemoSelfHeal(): DemoSelfHealContextValue {
  const context = useContext(DemoSelfHealContext);

  if (!context) {
    throw new Error('useDemoSelfHeal must be used inside DemoSelfHealProvider.');
  }

  return context;
}
