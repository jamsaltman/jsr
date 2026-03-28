import { describe, expect, it, vi } from 'vitest';

import { compilePatchPayload, createSelfHealRuntime, validatePatchPayload } from './runtime';
import type { PatchPayload } from './types';

const validPatch: PatchPayload = {
  actionId: 'create-note',
  version: 1,
  format: 'function-body',
  functionBody: "const text = input.text.trim(); return { note: { id: 'patched-note', text } };"
};

describe('validatePatchPayload', () => {
  it('accepts a valid patch payload', () => {
    expect(validatePatchPayload(validPatch, ['create-note'])).toEqual(validPatch);
  });

  it('rejects an invalid patch payload', () => {
    expect(() => validatePatchPayload({ ...validPatch, actionId: 'other-action' }, ['create-note'])).toThrow(
      'Unsupported self-heal action: other-action'
    );
    expect(() => validatePatchPayload({ ...validPatch, version: 2 }, ['create-note'])).toThrow(
      'Patch payload version must be 1.'
    );
    expect(() => validatePatchPayload({ ...validPatch, functionBody: '   ' }, ['create-note'])).toThrow(
      'Patch payload functionBody must be a non-empty string.'
    );
  });
});

describe('compilePatchPayload', () => {
  it('returns an async-compatible action', async () => {
    const compiled = compilePatchPayload<{ text: string }, { note: { id: string; text: string } }>(validPatch);
    await expect(compiled({ text: '  hello  ' })).resolves.toEqual({
      note: { id: 'patched-note', text: 'hello' }
    });
  });
});

describe('createSelfHealRuntime', () => {
  function withSessionStorage<T>(callback: () => Promise<T> | T) {
    const storage = new Map<string, string>();
    const previousWindow = (globalThis as { window?: unknown }).window;
    const sessionStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value);
      },
      removeItem: (key: string) => {
        storage.delete(key);
      }
    };

    (globalThis as { window?: unknown }).window = { sessionStorage };

    const finish = () => {
      if (previousWindow === undefined) {
        delete (globalThis as { window?: unknown }).window;
      } else {
        (globalThis as { window?: unknown }).window = previousWindow;
      }
    };

    const result = callback();
    return Promise.resolve(result).finally(finish);
  }

  it('requests a patch and retries exactly once', async () => {
    const requestPatch = vi.fn(async () => validPatch);
    const originalAction = vi.fn(async () => {
      throw new TypeError('input.text.trimmed is not a function');
    });

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch
    });

    await expect(
      runtime.executeAction({
        actionId: 'create-note',
        input: { text: '  hi  ' },
        action: originalAction,
        hint: 'fix create-note'
      })
    ).resolves.toEqual({
      note: { id: 'patched-note', text: 'hi' }
    });

    expect(originalAction).toHaveBeenCalledTimes(1);
    expect(requestPatch).toHaveBeenCalledTimes(1);
    expect(runtime.registry.has('create-note')).toBe(true);
  });

  it('fails closed when the retry also fails', async () => {
    const requestPatch = vi.fn(async () => ({
      ...validPatch,
      functionBody: "throw new Error('still broken');"
    }));
    const onDiagnostic = vi.fn();

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch,
      onDiagnostic
    });

    await expect(
      runtime.executeAction({
        actionId: 'create-note',
        input: { text: 'hello' },
        action: async () => {
          throw new Error('broken original');
        },
        hint: 'fix create-note'
      })
    ).rejects.toThrow('still broken');

    expect(requestPatch).toHaveBeenCalledTimes(1);
    expect(runtime.registry.has('create-note')).toBe(false);
    expect(onDiagnostic).toHaveBeenCalledWith('Self-heal retry failed.', expect.any(Error));
  });

  it('fails closed when requestPatch returns an invalid payload', async () => {
    const requestPatch = vi.fn(async () => ({
      ...validPatch,
      version: 2
    } as unknown as PatchPayload));

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch
    });

    await expect(
      runtime.executeAction({
        actionId: 'create-note',
        input: { text: 'hello' },
        action: async () => {
          throw new Error('broken original');
        },
        hint: 'fix create-note'
      })
    ).rejects.toThrow('Patch payload version must be 1.');

    expect(requestPatch).toHaveBeenCalledTimes(1);
    expect(runtime.registry.has('create-note')).toBe(false);
  });

  it('fails closed when the patch body cannot compile', async () => {
    const requestPatch = vi.fn(async () => ({
      ...validPatch,
      functionBody: 'return {'
    } as PatchPayload));

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch
    });

    await expect(
      runtime.executeAction({
        actionId: 'create-note',
        input: { text: 'hello' },
        action: async () => {
          throw new Error('broken original');
        },
        hint: 'fix create-note'
      })
    ).rejects.toThrow();

    expect(requestPatch).toHaveBeenCalledTimes(1);
    expect(runtime.registry.has('create-note')).toBe(false);
  });

  it('fails closed when a patched result does not match the validator contract', async () => {
    const requestPatch = vi.fn(async () => ({
      ...validPatch,
      functionBody: "return { unexpected: true };"
    }));

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch,
      resultValidators: {
        'create-note': (value) =>
          !!value &&
          typeof value === 'object' &&
          typeof (value as { note?: { id?: string; text?: string } }).note?.id === 'string' &&
          typeof (value as { note?: { id?: string; text?: string } }).note?.text === 'string'
      }
    });

    await expect(
      runtime.executeAction({
        actionId: 'create-note',
        input: { text: 'hello' },
        action: async () => {
          throw new Error('broken original');
        },
        hint: 'fix create-note'
      })
    ).rejects.toThrow('Patched result failed validation for create-note.');

    expect(runtime.registry.has('create-note')).toBe(false);
  });

  it('reuses a cached patch in the same browser session', async () => {
    await withSessionStorage(async () => {
      const requestPatch = vi.fn(async () => validPatch);

      const runtimeA = createSelfHealRuntime({
        allowedActionIds: ['create-note'],
        enabled: true,
        requestPatch
      });

      await expect(
        runtimeA.executeAction({
          actionId: 'create-note',
          input: { text: 'hello' },
          action: async () => {
            throw new Error('broken original');
          },
          hint: 'fix create-note',
          sourceSnippet: 'async function createNoteAction(input) { return input.text.trimmed(); }'
        })
      ).resolves.toEqual({
        note: { id: 'patched-note', text: 'hello' }
      });

      expect(requestPatch).toHaveBeenCalledTimes(1);

      const runtimeB = createSelfHealRuntime({
        allowedActionIds: ['create-note'],
        enabled: true,
        requestPatch
      });
      const originalAction = vi.fn(async () => {
        throw new Error('broken original');
      });

      await expect(
        runtimeB.executeAction({
          actionId: 'create-note',
          input: { text: 'hello again' },
          action: originalAction,
          hint: 'fix create-note',
          sourceSnippet: 'async function createNoteAction(input) { return input.text.trimmed(); }'
        })
      ).resolves.toEqual({
        note: { id: 'patched-note', text: 'hello again' }
      });

      expect(requestPatch).toHaveBeenCalledTimes(1);
      expect(originalAction).toHaveBeenCalledTimes(0);
    });
  });

  it('deduplicates concurrent patch requests for the same action', async () => {
    let resolvePatch: ((patch: PatchPayload) => void) | undefined;
    const requestPatch = vi.fn(
      () =>
        new Promise<PatchPayload>((resolve) => {
          resolvePatch = resolve;
        })
    );

    const runtime = createSelfHealRuntime({
      allowedActionIds: ['create-note'],
      enabled: true,
      requestPatch
    });

    const originalAction = vi.fn(async () => {
      throw new Error('broken original');
    });

    const firstRun = runtime.executeAction({
      actionId: 'create-note',
      input: { text: 'first' },
      action: originalAction,
      hint: 'fix create-note'
    });
    const secondRun = runtime.executeAction({
      actionId: 'create-note',
      input: { text: 'second' },
      action: originalAction,
      hint: 'fix create-note'
    });

    await Promise.resolve();
    expect(requestPatch).toHaveBeenCalledTimes(1);

    resolvePatch?.(validPatch);

    await expect(firstRun).resolves.toEqual({
      note: { id: 'patched-note', text: 'first' }
    });
    await expect(secondRun).resolves.toEqual({
      note: { id: 'patched-note', text: 'second' }
    });
  });
});
