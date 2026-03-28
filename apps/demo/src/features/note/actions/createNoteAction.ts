import { isCreateNoteResult, type CreateNoteAction } from '../types';

export const MANUAL_BREAK_EDIT = "Change text.trim() to text.trimmed() in createNoteAction.ts";

export const createNoteAction: CreateNoteAction = async ({ text }) => {
  const trimmedText = text.trim(); // Demo break site: change trim() -> trimmed()

  if (!trimmedText) {
    throw new Error('Please enter a note before saving.');
  }

  return {
    note: {
      id: globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`,
      text: trimmedText
    }
  };
};

export const selfHealMeta = {
  createNoteAction: {
    actionId: 'create-note',
    buildHint: (sourceSnippet: string) =>
      [
        'Patch the create-note action for a tiny React note-saving demo.',
        'The function receives { text: string } and must return { note: { id: string, text: string } }.',
        'Trim input.text before saving. Throw if the trimmed value is empty.',
        'Do not reference React, UI state, or server-only modules inside the function body.',
        'Return only the function body for the action implementation.',
        'Current action source:',
        sourceSnippet
      ].join('\n'),
    validateResult: isCreateNoteResult
  }
} as const;
