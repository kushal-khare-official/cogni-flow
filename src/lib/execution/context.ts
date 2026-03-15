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

    if (output !== undefined) {
      let current: unknown = output;
      for (let i = 1; i < parts.length; i++) {
        if (current === null || current === undefined) break;
        if (typeof current !== "object") { current = undefined; break; }
        current = (current as Record<string, unknown>)[parts[i]];
      }
      if (current !== undefined) return current;
    }

    // Fall back to _inputs so expressions like {{result}}, {{name}}, or even
    // {{node-1.result}} resolve from the current step's gathered input when
    // the primary lookup yields undefined.
    if (nodeId !== "credential" && nodeId !== "_inputs") {
      const inputs = this.outputs.get("_inputs") as Record<string, unknown> | undefined;
      if (inputs && typeof inputs === "object") {
        const fieldParts = parts.length > 1 ? parts.slice(1) : parts;
        let current: unknown = inputs[fieldParts[0]];
        for (let i = 1; i < fieldParts.length; i++) {
          if (current === null || current === undefined) return undefined;
          if (typeof current !== "object") return undefined;
          current = (current as Record<string, unknown>)[fieldParts[i]];
        }
        return current;
      }
    }

    return undefined;
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
