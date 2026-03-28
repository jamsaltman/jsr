import {
  createSelfHealActionCatalog,
  createSelfHealRuntime,
  validatePatchPayload,
  type ActionCatalog,
  type PatchPayload,
  type RecoveryRequest,
  type StatusUpdate
} from '@ralphthon/self-heal-runtime';

import { actionKeyToActionId, buildActionHint, CREATE_NOTE_ACTION_ID } from './actionHints';
import { isCreateNoteResult, type CreateNoteAction } from '../features/note/types';

export type CreateNotePatchRequest = (
  request: RecoveryRequest<{ text: string }>
) => Promise<PatchPayload>;

export interface DemoRuntimeClientOptions {
  enabled: boolean;
  requestPatch?: CreateNotePatchRequest;
  onStatusChange?: (update: StatusUpdate) => void;
  onPatchApplied?: (payload: PatchPayload) => void;
  onDiagnostic?: (message: string, details?: unknown) => void;
}

export interface DemoActionCatalog extends ActionCatalog {
  createNoteAction: CreateNoteAction;
}

export async function requestPatchFromServer<TInput>(request: RecoveryRequest<TInput>): Promise<PatchPayload> {
  const response = await fetch('/api/self-heal/patch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  });

  const payload = (await response.json()) as { error?: string; details?: string } | PatchPayload;

  if (!response.ok) {
    throw new Error(payload && 'error' in payload ? `${payload.error}${payload.details ? `
${payload.details}` : ''}` : 'Patch request failed.');
  }

  return validatePatchPayload(payload, [CREATE_NOTE_ACTION_ID]);
}

export function createDemoRuntimeClient(options: DemoRuntimeClientOptions) {
  const requestPatch = options.requestPatch ?? requestPatchFromServer;

  return createSelfHealRuntime({
    allowedActionIds: [CREATE_NOTE_ACTION_ID],
    enabled: options.enabled,
    resultValidators: {
      [CREATE_NOTE_ACTION_ID]: isCreateNoteResult
    },
    requestPatch: (request) =>
      requestPatch(request as RecoveryRequest<{ text: string }>),
    onStatusChange: options.onStatusChange,
    onPatchApplied: options.onPatchApplied,
    onDiagnostic: options.onDiagnostic
  });
}

export function createDemoActionCatalog(
  options: DemoRuntimeClientOptions,
  actions: DemoActionCatalog
): DemoActionCatalog {
  const runtime = createDemoRuntimeClient(options);

  return createSelfHealActionCatalog({
    actions,
    executor: runtime,
    getActionId: (key) => actionKeyToActionId(String(key)),
    buildHint: (key, action) => buildActionHint(actionKeyToActionId(String(key)), action.toString())
  }) as DemoActionCatalog;
}
