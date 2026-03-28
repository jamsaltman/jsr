import { PatchRegistry } from './patch-registry';
import type { ExecuteActionOptions, PatchPayload, RecoveryRequest, SelfHealRuntimeOptions } from './types';

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

export function createSelfHealRuntime(options: SelfHealRuntimeOptions) {
  const registry = new PatchRegistry();
  const validateResult = (actionId: string, value: unknown): void => {
    const validator = options.resultValidators?.[actionId];

    if (!validator) {
      return;
    }

    if (!validator(value)) {
      registry.delete(actionId);
      throw new Error(`Patched result failed validation for ${actionId}.`);
    }
  };

  return {
    registry,
    async executeAction<TInput, TOutput>(actionOptions: ExecuteActionOptions<TInput, TOutput>): Promise<TOutput> {
      const { actionId, action, input, hint, sourceSnippet } = actionOptions;
      assertAllowedActionId(actionId, options.allowedActionIds);

      const isPatchedActionInstalled = registry.has(actionId);
      const activeAction = registry.get<TInput, TOutput>(actionId) ?? action;

      try {
        const result = await activeAction(input);
        if (isPatchedActionInstalled) {
          validateResult(actionId, result);
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
          patch = validatePatchPayload(await options.requestPatch(request), options.allowedActionIds);
        } catch (patchError) {
          options.onDiagnostic?.('Self-heal patch request failed.', patchError);
          options.onStatusChange?.({ actionId, status: 'idle' });
          throw patchError;
        }

        const patchedAction = compilePatchPayload<TInput, TOutput>(patch);
        registry.set(actionId, patchedAction);
        options.onPatchApplied?.(patch);
        options.onStatusChange?.({ actionId, status: 'retrying' });

        try {
          const result = await patchedAction(input);
          validateResult(actionId, result);
          return result;
        } catch (retryError) {
          registry.delete(actionId);
          options.onDiagnostic?.('Self-heal retry failed.', retryError);
          throw retryError;
        } finally {
          options.onStatusChange?.({ actionId, status: 'idle' });
        }
      }
    }
  };
}
