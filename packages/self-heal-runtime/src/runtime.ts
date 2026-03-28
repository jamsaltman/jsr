import { PatchRegistry } from './patch-registry';
import type { ExecuteActionOptions, PatchPayload, RecoveryRequest, SelfHealRuntimeOptions } from './types';

const PATCH_CACHE_KEY = 'ralphthon:self-heal:patch-cache:v1';

function assertAllowedActionId(actionId: string, allowedActionIds?: readonly string[]): void {
  if (!allowedActionIds?.length) {
    return;
  }

  if (!allowedActionIds.includes(actionId)) {
    throw new Error(`Unsupported self-heal action: ${actionId}`);
  }
}

export function validatePatchPayload(payload: unknown, allowedActionIds?: readonly string[]): PatchPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Patch payload must be an object.');
  }

  const candidate = payload as Partial<PatchPayload>;

  if (typeof candidate.actionId !== 'string') {
    throw new Error('Patch payload is missing actionId.');
  }

  assertAllowedActionId(candidate.actionId, allowedActionIds);

  if (candidate.version !== 1) {
    throw new Error('Patch payload version must be 1.');
  }

  if (candidate.format !== 'function-body') {
    throw new Error('Patch payload format must be "function-body".');
  }

  if (typeof candidate.functionBody !== 'string' || candidate.functionBody.trim().length === 0) {
    throw new Error('Patch payload functionBody must be a non-empty string.');
  }

  if (candidate.rationale !== undefined && typeof candidate.rationale !== 'string') {
    throw new Error('Patch payload rationale must be a string when provided.');
  }

  return candidate as PatchPayload;
}

export function compilePatchPayload<TInput, TOutput>(payload: PatchPayload): (input: TInput) => Promise<TOutput> {
  const compiled = new Function('input', payload.functionBody) as (input: TInput) => TOutput | Promise<TOutput>;

  return async (input: TInput) => Promise.resolve(compiled(input));
}

function getSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function hashSourceSnippet(sourceSnippet: string): string {
  let hash = 5381;

  for (let index = 0; index < sourceSnippet.length; index += 1) {
    hash = (hash * 33) ^ sourceSnippet.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function getPatchCache(): Record<string, PatchPayload> {
  const storage = getSessionStorage();
  if (!storage) {
    return {};
  }

  try {
    const raw = storage.getItem(PATCH_CACHE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, PatchPayload>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writePatchCache(cache: Record<string, PatchPayload>): void {
  const storage = getSessionStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PATCH_CACHE_KEY, JSON.stringify(cache));
}

function buildPatchCacheEntryKey(actionId: string, sourceSnippet?: string): string | null {
  if (!sourceSnippet) {
    return null;
  }

  return `${actionId}:${hashSourceSnippet(sourceSnippet)}`;
}

export function createSelfHealRuntime(options: SelfHealRuntimeOptions) {
  const registry = new PatchRegistry();
  const inFlightPatchRequests = new Map<string, Promise<PatchPayload>>();
  const installPatch = <TInput, TOutput>(actionId: string, patch: PatchPayload, sourceSnippet?: string) => {
    const patchedAction = compilePatchPayload<TInput, TOutput>(patch);
    registry.set(actionId, patchedAction);

    const cacheEntryKey = buildPatchCacheEntryKey(actionId, sourceSnippet);
    if (cacheEntryKey) {
      const patchCache = getPatchCache();
      patchCache[cacheEntryKey] = patch;
      writePatchCache(patchCache);
    }

    return patchedAction;
  };
  const removePatch = (actionId: string, sourceSnippet?: string) => {
    registry.delete(actionId);

    const cacheEntryKey = buildPatchCacheEntryKey(actionId, sourceSnippet);
    if (cacheEntryKey) {
      const patchCache = getPatchCache();
      delete patchCache[cacheEntryKey];
      writePatchCache(patchCache);
    }
  };
  const validateResult = (actionId: string, value: unknown, sourceSnippet?: string): void => {
    const validator = options.resultValidators?.[actionId];

    if (!validator) {
      return;
    }

    if (!validator(value)) {
      removePatch(actionId, sourceSnippet);
      throw new Error(`Patched result failed validation for ${actionId}.`);
    }
  };
  const requestPatchOnce = async <TInput>(
    actionId: string,
    request: RecoveryRequest<TInput>
  ): Promise<PatchPayload> => {
    const activeRequest = inFlightPatchRequests.get(actionId);
    if (activeRequest) {
      return activeRequest;
    }

    const nextRequest = (async () =>
      validatePatchPayload(await options.requestPatch(request), options.allowedActionIds))().finally(() => {
      inFlightPatchRequests.delete(actionId);
    });

    inFlightPatchRequests.set(actionId, nextRequest);
    return nextRequest;
  };

  return {
    registry,
    async executeAction<TInput, TOutput>(actionOptions: ExecuteActionOptions<TInput, TOutput>): Promise<TOutput> {
      const { actionId, action, input, hint, sourceSnippet } = actionOptions;
      assertAllowedActionId(actionId, options.allowedActionIds);

      if (options.enabled && !registry.has(actionId)) {
        const cacheEntryKey = buildPatchCacheEntryKey(actionId, sourceSnippet);
        if (cacheEntryKey) {
          const cachedPatch = getPatchCache()[cacheEntryKey];
          if (cachedPatch) {
            try {
              const validatedPatch = validatePatchPayload(cachedPatch, options.allowedActionIds);
              installPatch<TInput, TOutput>(actionId, validatedPatch, sourceSnippet);
            } catch {
              removePatch(actionId, sourceSnippet);
            }
          }
        }
      }

      const isPatchedActionInstalled = registry.has(actionId);
      const activeAction = registry.get<TInput, TOutput>(actionId) ?? action;

      try {
        const result = await activeAction(input);
        if (isPatchedActionInstalled) {
          validateResult(actionId, result, sourceSnippet);
        }
        return result;
      } catch (error) {
        if (!options.enabled || registry.has(actionId)) {
          throw error;
        }

        options.onStatusChange?.({ actionId, status: 'healing' });

        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : undefined;
        const request: RecoveryRequest<TInput> = {
          actionId,
          input,
          errorMessage: message,
          stack,
          hint,
          sourceSnippet
        };

        let patch: PatchPayload;
        try {
          patch = await requestPatchOnce(actionId, request);
        } catch (patchError) {
          options.onDiagnostic?.('Self-heal patch request failed.', patchError);
          options.onStatusChange?.({ actionId, status: 'idle' });
          throw patchError;
        }

        const patchedAction = installPatch<TInput, TOutput>(actionId, patch, sourceSnippet);
        options.onPatchApplied?.(patch);
        options.onStatusChange?.({ actionId, status: 'retrying' });

        try {
          const result = await patchedAction(input);
          validateResult(actionId, result, sourceSnippet);
          return result;
        } catch (retryError) {
          removePatch(actionId, sourceSnippet);
          options.onDiagnostic?.('Self-heal retry failed.', retryError);
          throw retryError;
        } finally {
          options.onStatusChange?.({ actionId, status: 'idle' });
        }
      }
    }
  };
}
