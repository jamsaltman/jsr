import type { FormEvent } from 'react';

interface NoteFormProps {
  busy: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
}

export default function NoteForm({ busy, value, onChange, onSubmit }: NoteFormProps) {
  return (
    <form className="note-form" onSubmit={onSubmit}>
      <label htmlFor="note-input">Write a quick note</label>
      <textarea
        id="note-input"
        name="note"
        placeholder="Remember the best science-fair demos feel inevitable."
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <button disabled={busy} type="submit">
        {busy ? 'Working…' : 'Save note'}
      </button>
    </form>
  );
}
