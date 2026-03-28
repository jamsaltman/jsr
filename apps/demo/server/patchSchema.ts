import type { RecoveryRequest } from '@ralphthon/self-heal-runtime';

export type CreateNoteRecoveryRequest = RecoveryRequest<{ text: string }>;

export function validateRecoveryRequest(payload: unknown): CreateNoteRecoveryRequest {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Patch request must be a JSON object.');
  }

  const candidate = payload as Partial<CreateNoteRecoveryRequest>;

  if (typeof candidate.actionId !== 'string' || candidate.actionId.trim().length === 0) {
    throw new Error('Patch request actionId must be a non-empty string.');
  }

  if (!candidate.input || typeof candidate.input !== 'object' || typeof candidate.input.text !== 'string') {
    throw new Error('Patch request input.text must be a string.');
  }

  if (typeof candidate.errorMessage !== 'string' || candidate.errorMessage.trim().length === 0) {
    throw new Error('Patch request errorMessage must be a non-empty string.');
  }

  if (typeof candidate.hint !== 'string' || candidate.hint.trim().length === 0) {
    throw new Error('Patch request hint must be a non-empty string.');
  }

  if (candidate.stack !== undefined && typeof candidate.stack !== 'string') {
    throw new Error('Patch request stack must be a string when provided.');
  }

  if (candidate.sourceSnippet !== undefined && typeof candidate.sourceSnippet !== 'string') {
    throw new Error('Patch request sourceSnippet must be a string when provided.');
  }

  return candidate as CreateNoteRecoveryRequest;
}
