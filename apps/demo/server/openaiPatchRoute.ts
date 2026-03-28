import { validatePatchPayload } from '@ralphthon/self-heal-runtime';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { createPatchProviderFromEnv } from './patchProvider';
import { validateRecoveryRequest } from './patchSchema';

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function writeJson(response: ServerResponse, statusCode: number, payload: object): void {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  response.end(JSON.stringify(payload));
}

export async function handlePatchRoute(request: IncomingMessage, response: ServerResponse): Promise<void> {
  try {
    const provider = createPatchProviderFromEnv();
    const payload = validateRecoveryRequest(await readJsonBody(request));
    const patch = validatePatchPayload(await provider(payload), ['create-note']);
    writeJson(response, 200, patch);
  } catch (error) {
    writeJson(response, 503, {
      error: error instanceof Error ? error.message : 'Failed to build patch payload.',
      details: error instanceof Error ? error.stack : undefined,
      diagnosticSurface: 'operator-log'
    });
  }
}
