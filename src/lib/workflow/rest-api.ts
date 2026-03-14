import type { BpmnNode } from "./types";
import { BpmnNodeType } from "./types";

function getNodeConfig(node: BpmnNode): Record<string, unknown> {
  const cfg = node.data.config;
  if (!cfg) return {};
  if (Array.isArray(cfg)) {
    const entries = cfg
      .map((item) => {
        if (
          item &&
          typeof item === "object" &&
          "key" in item &&
          "value" in item &&
          typeof (item as { key: unknown }).key === "string"
        ) {
          return [
            (item as { key: string }).key,
            (item as { value: unknown }).value,
          ] as const;
        }
        return null;
      })
      .filter((entry): entry is readonly [string, unknown] => !!entry);
    return Object.fromEntries(entries);
  }
  if (typeof cfg === "object") return cfg as Record<string, unknown>;
  return {};
}

export function findStartNode(nodes: BpmnNode[]): BpmnNode | undefined {
  return nodes.find((n) => n.data.bpmnType === BpmnNodeType.StartEvent);
}

function normalizeRequestSchema(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    return raw;
  }
}

export function getStartRequestBodySchema(nodes: BpmnNode[]): unknown {
  const start = findStartNode(nodes);
  if (!start) return undefined;

  const cfg = getNodeConfig(start);
  return normalizeRequestSchema(
    cfg.requestBodySchema ?? cfg.requestBodyStructure ?? cfg.requestSchema,
  );
}

function checkValueAgainstSchema(
  schema: unknown,
  value: unknown,
  path: string,
  errors: string[],
): void {
  if (typeof schema === "string") {
    const lowered = schema.toLowerCase();
    if (["string", "number", "boolean", "object", "array"].includes(lowered)) {
      const ok =
        (lowered === "array" && Array.isArray(value)) ||
        (lowered === "object" &&
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)) ||
        (lowered === "string" && typeof value === "string") ||
        (lowered === "number" && typeof value === "number") ||
        (lowered === "boolean" && typeof value === "boolean");
      if (!ok) {
        errors.push(`${path} must be ${lowered}`);
      }
    }
    return;
  }

  if (Array.isArray(schema)) {
    if (!Array.isArray(value)) {
      errors.push(`${path} must be an array`);
      return;
    }
    if (schema.length === 1) {
      value.forEach((item, index) =>
        checkValueAgainstSchema(schema[0], item, `${path}[${index}]`, errors),
      );
    }
    return;
  }

  if (schema && typeof schema === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      errors.push(`${path} must be an object`);
      return;
    }

    const schemaObj = schema as Record<string, unknown>;
    const valueObj = value as Record<string, unknown>;

    for (const [rawKey, childSchema] of Object.entries(schemaObj)) {
      const optional = rawKey.endsWith("?");
      const key = optional ? rawKey.slice(0, -1) : rawKey;

      if (!(key in valueObj)) {
        if (!optional) {
          errors.push(`${path}.${key} is required`);
        }
        continue;
      }

      checkValueAgainstSchema(childSchema, valueObj[key], `${path}.${key}`, errors);
    }
  }
}

export function validateStartRequestBody(
  nodes: BpmnNode[],
  payload: unknown,
): { valid: boolean; errors: string[] } {
  const schema = getStartRequestBodySchema(nodes);
  if (!schema) return { valid: true, errors: [] };

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, errors: ["body must be a JSON object"] };
  }

  const errors: string[] = [];
  checkValueAgainstSchema(schema, payload, "body", errors);
  return { valid: errors.length === 0, errors };
}

export function getStopResponseWebhookUrl(nodes: BpmnNode[]): string | undefined {
  for (const node of nodes) {
    if (node.data.bpmnType !== BpmnNodeType.EndEvent) continue;
    const cfg = getNodeConfig(node);
    const candidate =
      cfg.responseWebhookUrl ?? cfg.callbackUrl ?? cfg.webhookUrl ?? cfg.responseUrl;
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return undefined;
}

export async function postWorkflowResponseWebhook(
  url: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Unsupported webhook protocol: ${parsed.protocol}`);
    }
  } catch (err) {
    console.error("[workflow/rest-api] Invalid response webhook URL", err);
    return;
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error(
        "[workflow/rest-api] Response webhook failed",
        res.status,
        res.statusText,
      );
    }
  } catch (err) {
    console.error("[workflow/rest-api] Response webhook request failed", err);
  }
}
