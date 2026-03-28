export interface OperatorLogEntry {
  id: string;
  level: 'info' | 'error';
  message: string;
  details?: string;
}

export function appendOperatorLog(
  entries: OperatorLogEntry[],
  entry: Omit<OperatorLogEntry, 'id'>
): OperatorLogEntry[] {
  const nextEntry: OperatorLogEntry = {
    id: globalThis.crypto?.randomUUID?.() ?? `log-${Date.now()}-${entries.length}`,
    ...entry
  };

  return [nextEntry, ...entries].slice(0, 12);
}

export function formatDetails(details: unknown): string | undefined {
  if (!details) {
    return undefined;
  }

  if (details instanceof Error) {
    return details.stack ?? details.message;
  }

  if (typeof details === 'string') {
    return details;
  }

  return JSON.stringify(details, null, 2);
}
