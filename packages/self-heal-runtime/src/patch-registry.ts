export class PatchRegistry {
  private readonly entries = new Map<string, (input: unknown) => Promise<unknown>>();

  get<TInput, TOutput>(actionId: string): ((input: TInput) => Promise<TOutput>) | undefined {
    return this.entries.get(actionId) as ((input: TInput) => Promise<TOutput>) | undefined;
  }

  set<TInput, TOutput>(actionId: string, action: (input: TInput) => Promise<TOutput>): void {
    this.entries.set(actionId, action as (input: unknown) => Promise<unknown>);
  }

  delete(actionId: string): void {
    this.entries.delete(actionId);
  }

  has(actionId: string): boolean {
    return this.entries.has(actionId);
  }
}
