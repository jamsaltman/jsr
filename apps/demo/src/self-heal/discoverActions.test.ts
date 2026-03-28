import { describe, expect, it } from 'vitest';

import { collectAutoHealMetadata, collectAutoHealableExports, isAutoHealableExport } from './discoverActions';

describe('discoverActions helpers', () => {
  it('detects exported async functions as auto-healable', () => {
    const asyncHandler = async () => 'ok';
    const syncHandler = () => 'nope';

    expect(isAutoHealableExport(asyncHandler)).toBe(true);
    expect(isAutoHealableExport(syncHandler)).toBe(false);
    expect(isAutoHealableExport('not-a-function')).toBe(false);
  });

  it('collects all exported async functions, not just *Action names', () => {
    const modules = {
      './note.ts': {
        createNoteAction: async () => 'note',
        saveNote: async () => 'save',
        helperValue: 'ignore-me',
        syncUtility: () => 'ignore-me-too'
      }
    };

    expect(collectAutoHealableExports(modules)).toEqual({
      createNoteAction: modules['./note.ts'].createNoteAction,
      saveNote: modules['./note.ts'].saveNote
    });
  });

  it('collects optional self-heal metadata alongside async exports', () => {
    const validateResult = (value: unknown) => Boolean(value);
    const buildHint = (sourceSnippet: string) => `hint:${sourceSnippet}`;
    const modules = {
      './note.ts': {
        createNoteAction: async () => 'note',
        selfHealMeta: {
          createNoteAction: {
            actionId: 'create-note',
            buildHint,
            validateResult
          }
        }
      }
    };

    expect(collectAutoHealMetadata(modules)).toEqual({
      createNoteAction: {
        actionId: 'create-note',
        buildHint,
        validateResult
      }
    });
  });
});
