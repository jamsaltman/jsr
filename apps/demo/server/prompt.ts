import type { CreateNoteRecoveryRequest } from './patchSchema';

export function buildPatchPrompt(request: CreateNoteRecoveryRequest): string {
  return [
    'You are repairing one broken JavaScript action for a tiny React note-saving demo.',
    'Return JSON only with this exact shape:',
    '{"actionId":"create-note","version":1,"format":"function-body","functionBody":"...","rationale":"..."}',
    'The function body will be executed as new Function("input", functionBody).',
    'The body must accept input = { text: string } and return { note: { id: string, text: string } }.',
    'It must trim input.text, throw if it becomes empty, and create a note id with globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`.',
    'Do not mention React, imports, or TypeScript syntax. Only write JavaScript for the function body.',
    'Recovery request:',
    JSON.stringify(request, null, 2)
  ].join('\n\n');
}
