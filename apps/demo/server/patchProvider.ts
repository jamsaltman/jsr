import { validatePatchPayload, type PatchPayload } from '@ralphthon/self-heal-runtime';

import type { CreateNoteRecoveryRequest } from './patchSchema';
import { buildPatchPrompt } from './prompt';

export type PatchProvider = (request: CreateNoteRecoveryRequest) => Promise<PatchPayload>;

const STUB_PATCH: PatchPayload = {
  actionId: 'create-note',
  version: 1,
  format: 'function-body',
  functionBody: [
    "const text = input.text.trim();",
    "if (!text) { throw new Error('Please enter a note before saving.'); }",
    "return { note: { id: globalThis.crypto?.randomUUID?.() ?? `note-${Date.now()}`, text } };"
  ].join('\n'),
  rationale: 'Deterministic stub patch for tests and local non-live verification.'
};

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === 'string' && payload.output_text.trim().length > 0) {
    return payload.output_text;
  }

  const textFromBlocks = payload?.output
    ?.flatMap((entry: any) => entry?.content ?? [])
    ?.map((content: any) => content?.text)
    ?.filter((text: unknown) => typeof text === 'string')
    ?.join('\n');

  if (typeof textFromBlocks === 'string' && textFromBlocks.trim().length > 0) {
    return textFromBlocks;
  }

  throw new Error('OpenAI response did not include output text.');
}

function parsePatchPayload(text: string): PatchPayload {
  try {
    return validatePatchPayload(JSON.parse(text), ['create-note']);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error('OpenAI response did not contain a JSON patch payload.');
    }

    return validatePatchPayload(JSON.parse(match[0]), ['create-note']);
  }
}

export function createStubPatchProvider(): PatchProvider {
  return async () => STUB_PATCH;
}

export function createOpenAIPatchProvider(options: { apiKey?: string; model?: string }): PatchProvider {
  return async (request) => {
    if (!options.apiKey) {
      throw new Error('Missing OPENAI_API_KEY. Manual demo mode fails closed until credentials are configured.');
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: options.model ?? 'gpt-5.4-mini',
        input: buildPatchPrompt(request)
      })
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`OpenAI patch request failed with ${response.status}: ${details}`);
    }

    const payload = (await response.json()) as unknown;
    return parsePatchPayload(extractOutputText(payload));
  };
}

export function createPatchProviderFromEnv(env: NodeJS.ProcessEnv = process.env): PatchProvider {
  if (env.SELF_HEAL_PATCH_PROVIDER === 'stub') {
    return createStubPatchProvider();
  }

  return createOpenAIPatchProvider({
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL
  });
}
