interface MockConfig {
  defaultResponse?: unknown;
  perOperation?: Record<string, unknown>;
  latencyMs?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeMock(
  mockConfig: MockConfig,
  operationId: string,
): Promise<Record<string, unknown>> {
  if (mockConfig.latencyMs && mockConfig.latencyMs > 0) {
    await delay(mockConfig.latencyMs);
  }

  const response =
    mockConfig.perOperation?.[operationId] ?? mockConfig.defaultResponse ?? {};

  if (response !== null && typeof response === "object" && !Array.isArray(response)) {
    return response as Record<string, unknown>;
  }

  return { result: response };
}
