import type { DemoActionCatalog } from './runtimeClient';

const actionModules = import.meta.glob<Record<string, unknown>>('../features/**/actions/*.ts', {
  eager: true
});

export type DemoActionOverrides = Partial<DemoActionCatalog>;

export interface AutoHealMetadata {
  actionId?: string;
  buildHint?: (sourceSnippet: string) => string;
  validateResult?: (value: unknown) => boolean;
}

export interface DiscoveredDemoActions {
  actions: DemoActionCatalog;
  metadata: Partial<Record<string, AutoHealMetadata>>;
}

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

export function collectAutoHealMetadata(modules: Record<string, Record<string, unknown>>) {
  const metadata: Partial<Record<string, AutoHealMetadata>> = {};

  for (const moduleExports of Object.values(modules)) {
    const moduleMetadata = moduleExports.selfHealMeta;
    if (!moduleMetadata || typeof moduleMetadata !== 'object') {
      continue;
    }

    for (const [exportName, value] of Object.entries(moduleMetadata as Record<string, unknown>)) {
      if (value && typeof value === 'object') {
        metadata[exportName] = value as AutoHealMetadata;
      }
    }
  }

  return metadata;
}

export function discoverDemoActions(overrides: DemoActionOverrides = {}): DiscoveredDemoActions {
  const discovered = collectAutoHealableExports(actionModules);
  const metadata = collectAutoHealMetadata(actionModules);

  const actions = {
    ...discovered,
    ...overrides
  } as Partial<DemoActionCatalog>;

  if (typeof actions.createNoteAction !== 'function') {
    throw new Error('Expected createNoteAction to be auto-registered from the demo action modules.');
  }

  return {
    actions: actions as DemoActionCatalog,
    metadata
  };
}
