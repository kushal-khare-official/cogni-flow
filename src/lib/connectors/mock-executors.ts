function randomHex(length: number): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function randomBase64(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

type MockExecutor = (input: Record<string, unknown>) => Record<string, unknown>;

const executors: Record<string, MockExecutor> = {
  kafkaConnector: (input) => ({
    topic: input.topic || "events",
    partition: Math.floor(Math.random() * 6),
    offset: Math.floor(Math.random() * 1_000_000) + 100_000,
    timestamp: new Date().toISOString(),
  }),

  postgresConnector: (input) => ({
    rows: [{ id: 1, ...input }],
    rowCount: 1,
    command: input.query?.toString().split(" ")[0] || "SELECT",
  }),

  stripeConnector: (input) => {
    const piId = "pi_" + randomHex(24);
    return {
      paymentIntentId: piId,
      status: "succeeded",
      amount: input.amount || 1000,
      currency: input.currency || "usd",
      clientSecret: piId + "_secret_" + randomHex(16),
    };
  },

  salesforceConnector: (input) => ({
    id: "001" + randomHex(15),
    success: true,
    objectType: input.objectType || "Lead",
    fields: { Name: "Mock Record", Status: "Open" },
  }),

  sapConnector: (input) => ({
    documentNumber: "4500" + Math.floor(Math.random() * 100_000),
    status: "Posted",
    type: input.module || "MM",
    messages: [{ type: "S", message: "Document posted successfully" }],
  }),

  keycloakConnector: () => ({
    accessToken: "eyJ" + randomBase64(100),
    refreshToken: "eyJ" + randomBase64(80),
    userId: "usr-" + randomHex(12),
    roles: ["user", "admin"],
    expiresIn: 300,
  }),

  prometheusConnector: (input) => ({
    resultType: "matrix",
    values: Array.from({ length: 5 }, (_, i) => [
      Date.now() / 1000 - (4 - i) * 60,
      (Math.random() * 100).toFixed(2),
    ]),
    labels: {
      __name__: input.query || "http_requests_total",
      instance: "localhost:9090",
    },
  }),

  rpaConnector: () => ({
    executionId: "exec-" + randomHex(12),
    status: "completed",
    steps: [
      { name: "Open Application", status: "done", duration: 1200 },
      { name: "Process Data", status: "done", duration: 3400 },
      { name: "Generate Report", status: "done", duration: 2100 },
    ],
    outputData: { processedRecords: Math.floor(Math.random() * 100) + 1 },
  }),
};

export async function executeMockConnector(
  connectorType: string,
  input: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const executor = executors[connectorType];
  if (!executor) {
    return { error: `Unknown connector type: ${connectorType}`, input };
  }
  await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 40) + 10));
  return executor(input);
}
