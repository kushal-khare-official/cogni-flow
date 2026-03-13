import { ExecutionContext } from "./context";

const EXPRESSION_PATTERN = /\{\{(.+?)\}\}/g;
const SINGLE_EXPRESSION_PATTERN = /^\{\{(.+?)\}\}$/;

function resolveDotPath(path: string, context: ExecutionContext): unknown {
  const trimmed = path.trim();

  if (trimmed.startsWith("credential.")) {
    return context.resolve(trimmed);
  }

  return context.resolve(trimmed);
}

export function resolveExpression(
  template: string,
  context: ExecutionContext,
): unknown {
  const singleMatch = template.match(SINGLE_EXPRESSION_PATTERN);
  if (singleMatch) {
    return resolveDotPath(singleMatch[1], context);
  }

  return template.replace(EXPRESSION_PATTERN, (_match, path: string) => {
    const value = resolveDotPath(path, context);
    if (value === undefined || value === null) return "";
    return String(value);
  });
}

export function resolveTemplate(
  obj: unknown,
  context: ExecutionContext,
): unknown {
  if (typeof obj === "string") {
    return resolveExpression(obj, context);
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => resolveTemplate(item, context));
  }

  if (obj !== null && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = resolveTemplate(value, context);
    }
    return result;
  }

  return obj;
}

const CONDITION_PATTERN =
  /^\s*\{\{(.+?)\}\}\s*(===|!==|==|!=|>=|<=|>|<)\s*(.+?)\s*$/;

function parseConditionValue(raw: string): unknown {
  if (
    (raw.startsWith("'") && raw.endsWith("'")) ||
    (raw.startsWith('"') && raw.endsWith('"'))
  ) {
    return raw.slice(1, -1);
  }

  if (raw === "true") return true;
  if (raw === "false") return false;
  if (raw === "null") return null;
  if (raw === "undefined") return undefined;

  const num = Number(raw);
  if (!Number.isNaN(num)) return num;

  return raw;
}

export function evaluateCondition(
  expression: string,
  context: ExecutionContext,
): boolean {
  const match = expression.match(CONDITION_PATTERN);
  if (!match) return false;

  const [, path, operator, rawRight] = match;
  const left = resolveDotPath(path, context);
  const right = parseConditionValue(rawRight);

  switch (operator) {
    case "===":
    case "==":
      return left === right;
    case "!==":
    case "!=":
      return left !== right;
    case ">":
      return Number(left) > Number(right);
    case "<":
      return Number(left) < Number(right);
    case ">=":
      return Number(left) >= Number(right);
    case "<=":
      return Number(left) <= Number(right);
    default:
      return false;
  }
}
