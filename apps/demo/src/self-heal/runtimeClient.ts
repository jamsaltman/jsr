import {
  createSelfHealActionCatalog,
  createSelfHealRuntime,
  validatePatchPayload,
  type ActionCatalog,
  type PatchPayload,
  type RecoveryRequest,
  type StatusUpdate
} from '@ralphthon/self-heal-runtime';

import { actionKeyToActionId, buildActionHint } from './actionHints';
import { isCreateNoteResult, type CreateNoteAction } from '../features/note/types';

export type DemoPatchRequest = <TInput>(
  request: RecoveryRequest<TInput>
) => Promise<PatchPayload>;

export interface DemoRuntimeClientOptions {
  enabled: boolean;
  requestPatch?: DemoPatchRequest;
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

  return validatePatchPayload(payload);
}

function createDemoRuntimeClient(options: DemoRuntimeClientOptions, actions: DemoActionCatalog) {
  const requestPatch = options.requestPatch ?? requestPatchFromServer;
  const actionIds = Object.keys(actions).map((actionKey) => actionKeyToActionId(actionKey));

  return createSelfHealRuntime({
    allowedActionIds: actionIds,
    enabled: options.enabled,
    resultValidators: {
      [actionKeyToActionId('createNoteAction')]: isCreateNoteResult
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
  const runtime = createDemoRuntimeClient(options, actions);

  return createSelfHealActionCatalog({
    actions,
    executor: runtime,
    getActionId: (key) => actionKeyToActionId(String(key)),
    buildHint: (key, action) => buildActionHint(actionKeyToActionId(String(key)), action.toString())
  }) as DemoActionCatalog;
}
