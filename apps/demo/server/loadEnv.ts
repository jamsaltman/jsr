import fs from 'node:fs';
import path from 'node:path';

const serverDir = path.dirname(new URL(import.meta.url).pathname);
const repoRoot = path.resolve(serverDir, '../../..');

function parseValue(rawValue: string): string {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return '';
  }

  const quote = trimmed[0];
  const isQuoted = (quote === '"' || quote === "'") && trimmed.at(-1) === quote;

  if (isQuoted) {
    const inner = trimmed.slice(1, -1);
    if (quote === '"') {
      return inner
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t');
    }
    return inner;
  }

  const commentIndex = trimmed.search(/\s#/);
  return (commentIndex === -1 ? trimmed : trimmed.slice(0, commentIndex)).trim();
}

export function loadDemoEnvFiles(): string[] {
  const externallyDefinedKeys = new Set(Object.keys(process.env));
  const files = ['.env', '.env.local'];
  const loadedFiles: string[] = [];

  for (const fileName of files) {
    const filePath = path.join(repoRoot, fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    loadedFiles.push(filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    for (const line of content.split(/\r?\n/u)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const separatorIndex = line.indexOf('=');
      if (separatorIndex === -1) {
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key)) {
        continue;
      }

      if (externallyDefinedKeys.has(key)) {
        continue;
      }

      process.env[key] = parseValue(line.slice(separatorIndex + 1));
    }
  }

  return loadedFiles;
}
