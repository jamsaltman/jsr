export const CREATE_NOTE_ACTION_ID = 'create-note';

export function buildCreateNoteHint(sourceSnippet: string): string {
  return [
    'Patch the create-note action for a tiny React note-saving demo.',
    'The function receives { text: string } and must return { note: { id: string, text: string } }.',
    'Trim input.text before saving. Throw if the trimmed value is empty.',
    'Do not reference React, UI state, or server-only modules inside the function body.',
    'Return only the function body for the action implementation.',
    'Current action source:',
    sourceSnippet
  ].join('\n');
}
