import type { DemoActionCatalog } from './runtimeClient';

const actionModules = import.meta.glob<Record<string, unknown>>('../features/**/actions/*.ts', {
  eager: true
});

export type DemoActionOverrides = Partial<DemoActionCatalog>;

export function discoverDemoActions(overrides: DemoActionOverrides = {}): DemoActionCatalog {
  const discovered: Record<string, unknown> = {};

  for (const moduleExports of Object.values(actionModules)) {
    for (const [exportName, exportedValue] of Object.entries(moduleExports)) {
      if (exportName.endsWith('Action') && typeof exportedValue === 'function') {
        discovered[exportName] = exportedValue;
      }
    }
  }

  const actions = {
    ...discovered,
    ...overrides
  } as Partial<DemoActionCatalog>;

  if (typeof actions.createNoteAction !== 'function') {
    throw new Error('Expected createNoteAction to be auto-registered from the demo action modules.');
  }

  return actions as DemoActionCatalog;
}
