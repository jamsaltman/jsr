import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PatchPayload } from '@ralphthon/self-heal-runtime';

import type { CreateNoteAction } from './types';
import App from '../../App';
import { DemoSelfHealProvider } from '../../self-heal/provider';

const brokenCreateNoteAction: CreateNoteAction = async ({ text }) => {
  const trimmedText = (text as unknown as { trimmed: () => string }).trimmed();

  return {
    note: {
      id: 'broken-note',
      text: trimmedText
    }
  };
};

function renderDemoApp(options?: {
  initialUrlSearch?: string;
  requestPatch?: (request: { actionId: string; input: { text: string } }) => Promise<PatchPayload>;
  createNoteAction?: CreateNoteAction;
}) {
  return render(
    <DemoSelfHealProvider
      initialUrlSearch={options?.initialUrlSearch}
      requestPatch={options?.requestPatch}
      actionOverrides={options?.createNoteAction ? { createNoteAction: options.createNoteAction } : undefined}
    >
      <App />
    </DemoSelfHealProvider>
  );
}

describe('App note flow', () => {
  it('saves a note on the healthy path without self-heal', async () => {
    const user = userEvent.setup();
    renderDemoApp({ initialUrlSearch: '' });

    await user.type(screen.getByLabelText(/write a quick note/i), 'hello');
    await user.click(screen.getByRole('button', { name: /save note/i }));

    expect(await screen.findByText('hello')).toBeInTheDocument();
  });

  it('keeps the page mounted when the interaction is broken without self-heal', async () => {
    const user = userEvent.setup();
    renderDemoApp({ createNoteAction: brokenCreateNoteAction, initialUrlSearch: '' });

    await user.type(screen.getByLabelText(/write a quick note/i), 'hello again');
    await user.click(screen.getByRole('button', { name: /save note/i }));

    expect(await screen.findByText(/we couldn’t save that note just now/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save note/i })).toBeEnabled();
    expect(screen.getByText(/save a note without breaking the moment/i)).toBeInTheDocument();
    expect(screen.queryByText('hello again', { selector: '.note-card span' })).not.toBeInTheDocument();
  });

  it('heals the broken interaction with a deterministic stub patch and exactly one patch request', async () => {
    const user = userEvent.setup();
    const brokenAction = vi.fn(brokenCreateNoteAction);
    const requestPatch = vi.fn(async (request) => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      const patch: PatchPayload = {
        actionId: request.actionId,
        version: 1,
        format: 'function-body',
        functionBody: [
          "globalThis.__patchedRetryGuard = (globalThis.__patchedRetryGuard ?? 0) + 1;",
          "if (globalThis.__patchedRetryGuard > 1) { throw new Error('retried more than once'); }",
          "const text = input.text.trim();",
          "return { note: { id: 'patched-note', text } };"
        ].join('\\n')
      };
      return patch;
    });
    renderDemoApp({ createNoteAction: brokenAction, initialUrlSearch: '?selfHeal=1', requestPatch });

    await user.type(screen.getByLabelText(/write a quick note/i), 'hello again');
    await user.click(screen.getByRole('button', { name: /save note/i }));

    expect(await screen.findByText(/saving your note/i)).toBeInTheDocument();
    expect(await screen.findByText('hello again')).toBeInTheDocument();

    await waitFor(() => {
      expect(requestPatch).toHaveBeenCalledTimes(1);
    });
    expect(brokenAction).toHaveBeenCalledTimes(1);
  });
});
