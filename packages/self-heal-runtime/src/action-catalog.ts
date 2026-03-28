import type { ActionCatalog, ActionCatalogOptions } from './types';

function toKebabCase(value: string): string {
  return value
    .replace(/Action$/u, '')
    .replace(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replace(/_/gu, '-')
    .toLowerCase();
}

function defaultHint(actionId: string, sourceSnippet: string): string {
  return [
    `Patch the ${actionId} action for this app.`,
    'Return only the JavaScript function body for the action implementation.',
    'Keep the same async result shape as the original action.',
    'Current action source:',
    sourceSnippet
  ].join('\n');
}

export function createSelfHealActionCatalog<TActions extends ActionCatalog>({
  actions,
  executor,
  getActionId,
  buildHint,
  getSourceSnippet
}: ActionCatalogOptions<TActions>): TActions {
  const wrappedActions = {} as TActions;

  for (const key of Object.keys(actions) as Array<keyof TActions>) {
    const action = actions[key];
    const sourceSnippet = getSourceSnippet?.(key, action) ?? action.toString();
    const actionId = getActionId?.(key, action) ?? toKebabCase(String(key));
    const hint = buildHint?.(key, action) ?? defaultHint(actionId, sourceSnippet);

    wrappedActions[key] = (async (input: unknown) =>
      executor.executeAction({
        actionId,
        input,
        action,
        hint,
        sourceSnippet
      })) as TActions[typeof key];
  }

  return wrappedActions;
}
