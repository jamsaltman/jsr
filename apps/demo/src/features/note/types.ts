export interface Note {
  id: string;
  text: string;
}

export interface CreateNoteInput {
  text: string;
}

export interface CreateNoteResult {
  note: Note;
}

export type CreateNoteAction = (input: CreateNoteInput) => Promise<CreateNoteResult>;

export function isCreateNoteResult(value: unknown): value is CreateNoteResult {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<CreateNoteResult>;
  const note = candidate.note as Partial<Note> | undefined;

  return (
    !!note &&
    typeof note.id === 'string' &&
    note.id.length > 0 &&
    typeof note.text === 'string'
  );
}
