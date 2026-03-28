import type { CreateNoteRecoveryRequest } from './patchSchema';

export function buildPatchPrompt(request: CreateNoteRecoveryRequest): string {
  const lines = [
    `You are repairing one broken JavaScript action (${request.actionId}) for a tiny React demo.`,
    'Return JSON only with this exact shape:',
    `{"actionId":"${request.actionId}","version":1,"format":"function-body","functionBody":"...","rationale":"..."}`,
    'The function body will be executed as new Function("input", functionBody).',
    'Keep the same input contract and async result shape as the original function.',
    'Do not mention React, imports, or TypeScript syntax. Only write JavaScript for the function body.',
    'Recovery request:',
    JSON.stringify(request, null, 2)
  ];

  if (request.actionId === 'create-note') {
    lines.splice(
      4,
      0,
      'The body must accept input = { text: string } and return { note: { id: string, text: string } }.',
      'It must trim input.text, throw if it becomes empty, and create a note id with globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`.'
    );
  }

  return lines.join('\n\n');
}
