export class ExecutionContext {
  private outputs: Map<string, Record<string, unknown>>;

  constructor() {
    this.outputs = new Map();
  }

  set(nodeId: string, output: Record<string, unknown>): void {
    this.outputs.set(nodeId, output);
  }

  get(nodeId: string): Record<string, unknown> | undefined {
    return this.outputs.get(nodeId);
  }

  resolve(expression: string): unknown {
    const parts = expression.split(".");
    const nodeId = parts[0];
    const output = this.outputs.get(nodeId);
    if (output === undefined) return undefined;

    let current: unknown = output;
    for (let i = 1; i < parts.length; i++) {
      if (current === null || current === undefined) return undefined;
      if (typeof current !== "object") return undefined;
      current = (current as Record<string, unknown>)[parts[i]];
    }
    return current;
  }

  toJSON(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of this.outputs) {
      result[key] = value;
    }
    return result;
  }

  static fromJSON(data: Record<string, unknown>): ExecutionContext {
    const ctx = new ExecutionContext();
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        ctx.set(key, value as Record<string, unknown>);
      }
    }
    return ctx;
  }
}
