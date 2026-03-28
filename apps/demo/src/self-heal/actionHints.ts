export const CREATE_NOTE_ACTION_ID = 'create-note';

export function actionKeyToActionId(actionKey: string): string {
  return actionKey
    .replace(/Action$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .toLowerCase();
}

export function buildActionHint(actionId: string, sourceSnippet: string): string {
  const lines = [
    `Patch the ${actionId} action for a tiny React note-saving demo.`,
    'Keep the same input and async result shape as the original action.',
    'Do not reference React, UI state, or server-only modules inside the function body.',
    'Return only the function body for the action implementation.'
  ];

  if (actionId === CREATE_NOTE_ACTION_ID) {
    lines.push('The function receives { text: string } and must return { note: { id: string, text: string } }.');
    lines.push('Trim input.text before saving. Throw if the trimmed value is empty.');
  }

  lines.push('Current action source:', sourceSnippet);
  return lines.join('\n');
}
