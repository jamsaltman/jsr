export function isSelfHealEnabledFromSearch(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.get('selfHeal') === '1';
}
