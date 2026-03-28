import type { DemoActionCatalog } from './runtimeClient';

const actionModules = import.meta.glob<Record<string, unknown>>('../features/**/actions/*.ts', {
  eager: true
});

export type DemoActionOverrides = Partial<DemoActionCatalog>;

export function isAutoHealableExport(value: unknown): value is (...args: any[]) => Promise<unknown> {
  return typeof value === 'function' && value.constructor.name === 'AsyncFunction';
}

export function collectAutoHealableExports(modules: Record<string, Record<string, unknown>>) {
  const discovered: Record<string, unknown> = {};

  for (const moduleExports of Object.values(modules)) {
    for (const [exportName, exportedValue] of Object.entries(moduleExports)) {
      if (isAutoHealableExport(exportedValue)) {
        discovered[exportName] = exportedValue;
      }
    }
  }

  return discovered;
}

export function discoverDemoActions(overrides: DemoActionOverrides = {}): DemoActionCatalog {
  const discovered = collectAutoHealableExports(actionModules);

  const actions = {
    ...discovered,
    ...overrides
  } as Partial<DemoActionCatalog>;

  if (typeof actions.createNoteAction !== 'function') {
    throw new Error('Expected createNoteAction to be auto-registered from the demo action modules.');
  }

  return actions as DemoActionCatalog;
}
