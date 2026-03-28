export type SelfHealStatus = 'idle' | 'healing' | 'retrying';

export interface RecoveryRequest<TInput = unknown> {
  actionId: string;
  input: TInput;
  errorMessage: string;
  stack?: string;
  hint: string;
  sourceSnippet?: string;
}

export interface PatchPayload {
  actionId: string;
  version: 1;
  format: 'function-body';
  functionBody: string;
  rationale?: string;
}

export interface StatusUpdate {
  actionId: string;
  status: SelfHealStatus;
}

export type PatchRequestFn = <TInput>(request: RecoveryRequest<TInput>) => Promise<PatchPayload>;

export interface SelfHealRuntimeOptions {
  enabled: boolean;
  allowedActionIds?: readonly string[];
  resultValidators?: Partial<Record<string, (value: unknown) => boolean>>;
  requestPatch: PatchRequestFn;
  onStatusChange?: (update: StatusUpdate) => void;
  onPatchApplied?: (payload: PatchPayload) => void;
  onDiagnostic?: (message: string, details?: unknown) => void;
}

export interface ExecuteActionOptions<TInput, TOutput> {
  actionId: string;
  input: TInput;
  action: (input: TInput) => Promise<TOutput>;
  hint: string;
  sourceSnippet?: string;
}

export interface SelfHealExecutor {
  executeAction<TInput, TOutput>(actionOptions: ExecuteActionOptions<TInput, TOutput>): Promise<TOutput>;
}

export type AsyncAction<TInput = unknown, TOutput = unknown> = (input: TInput) => Promise<TOutput>;

export type ActionCatalog = Record<string, AsyncAction<any, any>>;

export interface ActionCatalogOptions<TActions extends ActionCatalog> {
  actions: TActions;
  executor: SelfHealExecutor;
  getActionId?: <K extends keyof TActions>(key: K, action: TActions[K]) => string;
  buildHint?: <K extends keyof TActions>(key: K, action: TActions[K]) => string;
  getSourceSnippet?: <K extends keyof TActions>(key: K, action: TActions[K]) => string | undefined;
}
