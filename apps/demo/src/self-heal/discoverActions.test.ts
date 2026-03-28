import { describe, expect, it } from 'vitest';

import { collectAutoHealableExports, isAutoHealableExport } from './discoverActions';

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
});
