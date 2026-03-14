import { ExecutionContext } from "../context";
import { resolveExpression, resolveTemplate } from "../expression";

export interface ExecutorParams {
  template: {
    baseConfig: {
      baseUrl?: string;
      authType?: string;
      authConfig?: Record<string, string>;
      defaultHeaders?: Record<string, string>;
    };
  };
  operation: {
    id: string;
    method?: string;
    path?: string;
    bodyTemplate?: unknown;
    queryTemplate?: Record<string, string>;
    headersOverride?: Record<string, string>;
  };
  resolvedInputs: Record<string, unknown>;
  credential: Record<string, string> | null;
}

function buildAuthHeader(
  authType: string | undefined,
  credential: Record<string, string> | null,
): Record<string, string> {
  if (!authType || authType === "none" || !credential) return {};

  switch (authType) {
    case "bearer": {
      const token =
        credential.apiKey ?? credential.accessToken ?? credential.bearerToken;
      if (!token) return {};
      return { Authorization: `Bearer ${token}` };
    }
    case "basic": {
      const encoded = btoa(
        `${credential.username ?? ""}:${credential.password ?? ""}`,
      );
      return { Authorization: `Basic ${encoded}` };
    }
    case "api_key_header": {
      const headerName = credential.headerName ?? "X-API-Key";
      const headerValue = credential.headerValue ?? credential.apiKey ?? "";
      return { [headerName]: headerValue };
    }
    default:
      return {};
  }
}

export async function executeHttp(
  params: ExecutorParams,
  context: ExecutionContext,
): Promise<Record<string, unknown>> {
  const { template, operation, credential } = params;
  const { baseConfig } = template;

  const resolvedBase = baseConfig.baseUrl
    ? String(resolveExpression(baseConfig.baseUrl, context))
    : "";
  const resolvedPath = operation.path
    ? String(resolveExpression(operation.path, context))
    : "";
  let url = `${resolvedBase}${resolvedPath}`;

  if (operation.queryTemplate) {
    const resolved = resolveTemplate(
      operation.queryTemplate,
      context,
    ) as Record<string, string>;
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(resolved)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const authHeaders = buildAuthHeader(baseConfig.authType, credential);

  const headers: Record<string, string> = {
    ...baseConfig.defaultHeaders,
    ...authHeaders,
    ...operation.headersOverride,
  };

  let body: string | undefined;
  if (operation.bodyTemplate !== undefined) {
    // Normalize: parse JSON string to object so each field value is resolved (e.g. {{node-1.name}} → actual value)
    let bodyTemplate = operation.bodyTemplate;
    if (typeof bodyTemplate === "string" && bodyTemplate.trim()) {
      try {
        bodyTemplate = JSON.parse(bodyTemplate) as Record<string, unknown>;
      } catch {
        // not valid JSON, resolveTemplate will still substitute {{...}} in the string
      }
    }
    const resolvedBody = resolveTemplate(bodyTemplate, context);
    body = typeof resolvedBody === "string"
      ? resolvedBody
      : JSON.stringify(resolvedBody);
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  }

  const method = (operation.method ?? "GET").toUpperCase();

  const response = await fetch(url, {
    method,
    headers,
    body: method !== "GET" && method !== "HEAD" ? body : undefined,
  });

  const responseHeaders: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    responseHeaders[key] = value;
  });

  let parsedBody: unknown;
  const text = await response.text();
  try {
    parsedBody = JSON.parse(text);
  } catch {
    parsedBody = text;
  }

  return {
    status: response.status,
    headers: responseHeaders,
    body: parsedBody,
  };
}
