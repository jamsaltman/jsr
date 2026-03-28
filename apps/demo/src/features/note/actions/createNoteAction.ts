import type { CreateNoteAction } from '../types';

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
