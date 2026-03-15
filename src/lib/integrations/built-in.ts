/**
 * Built-in integration definitions shared by seed and API (ensure-builtin).
 * Same shape as Prisma Integration create/update (id, name, icon, category, type, description, baseConfig, operations, credentialSchema, mockConfig, isBuiltIn).
 */
export const BUILT_IN_INTEGRATIONS = [
  {
    id: "tpl-rest-api",
    name: "REST API",
    icon: "globe",
    category: "api",
    type: "http",
    description: "Make HTTP requests to any REST API endpoint with configurable auth, headers, and body.",
    baseConfig: JSON.stringify({
      baseUrl: "",
      authType: "none",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "API Key / Bearer Token", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 150,
      defaultResponse: { status: 200, body: { message: "OK" } },
    }),
    operations: JSON.stringify([]),
    isBuiltIn: true,
  },
  {
    id: "tpl-rest-webhook",
    name: "REST API + Webhook Callback",
    icon: "webhook",
    category: "api",
    type: "webhook",
    description: "Call a REST API and receive asynchronous results via a webhook callback URL.",
    baseConfig: JSON.stringify({
      baseUrl: "",
      authType: "none",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "API Key / Bearer Token", type: "string", required: false, sensitive: true },
      { key: "webhookSecret", label: "Webhook Secret", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      defaultResponse: { accepted: true, callbackId: "cb_mock_123" },
    }),
    operations: JSON.stringify([]),
    isBuiltIn: true,
  },
  {
    id: "tpl-mcp-tool",
    name: "MCP Tool Call",
    icon: "wrench",
    category: "ai",
    type: "mcp_tool",
    description: "Invoke any tool from a configured MCP (Model Context Protocol) server.",
    baseConfig: JSON.stringify({}),
    credentialSchema: JSON.stringify([]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      defaultResponse: { result: "Mock MCP tool response" },
    }),
    operations: JSON.stringify([]),
    isBuiltIn: true,
  },
  {
    id: "tpl-custom-code",
    name: "Custom Code Script",
    icon: "code",
    category: "code",
    type: "code",
    description: "Execute custom JavaScript or Python code as a workflow step.",
    baseConfig: JSON.stringify({ language: "javascript" }),
    credentialSchema: JSON.stringify([]),
    mockConfig: JSON.stringify({
      latencyMs: 50,
      defaultResponse: { result: "mock code output" },
    }),
    operations: JSON.stringify([]),
    isBuiltIn: true,
  },
  {
    id: "tpl-kafka",
    name: "Kafka Topic Consumer",
    icon: "radio",
    category: "messaging",
    type: "kafka",
    description: "Consume messages from an Apache Kafka topic with configurable consumer groups and partitioning.",
    baseConfig: JSON.stringify({
      brokers: "localhost:9092",
      groupId: "",
      topic: "",
      fromBeginning: false,
    }),
    credentialSchema: JSON.stringify([
      { key: "saslUsername", label: "SASL Username", type: "string", required: false, sensitive: false },
      { key: "saslPassword", label: "SASL Password", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      defaultResponse: { topic: "test-topic", partition: 0, offset: "42", value: { orderId: "ord-123", amount: 99.99 } },
    }),
    operations: JSON.stringify([]),
    isBuiltIn: true,
  },
  {
    id: "tpl-kya-passport",
    name: "KYA Agent Passport",
    icon: "fingerprint",
    category: "kya",
    type: "http",
    description: "Register, verify, and revoke agent passports (Digital Agent Passport) for KYA onboarding.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.cogniflowUrl}}/api/agents",
      authType: "none",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    operations: JSON.stringify([
      { id: "registerAgent", name: "Register Agent", method: "POST", path: "/", bodyTemplate: { name: "{{name}}", modelProvider: "{{modelProvider}}", modelVersion: "{{modelVersion}}", creatorName: "{{creatorName}}" }, inputSchema: [{ key: "name", label: "Agent Name", type: "string", required: true }, { key: "modelProvider", label: "Model Provider", type: "string", required: true }, { key: "modelVersion", label: "Model Version", type: "string", required: false }, { key: "creatorName", label: "Creator Name", type: "string", required: true }] },
      { id: "verifyPassport", name: "Verify Passport", method: "POST", path: "/{{passportId}}/verify", inputSchema: [{ key: "passportId", label: "Passport ID", type: "string", required: true }] },
      { id: "getPassport", name: "Get Passport", method: "GET", path: "/{{passportId}}", inputSchema: [{ key: "passportId", label: "Passport ID", type: "string", required: true }] },
      { id: "revokePassport", name: "Revoke Passport", method: "POST", path: "/{{passportId}}/revoke", bodyTemplate: { reason: "{{reason}}" }, inputSchema: [{ key: "passportId", label: "Passport ID", type: "string", required: true }, { key: "reason", label: "Reason", type: "string", required: false }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "cogniflowUrl", label: "CogniFlow Base URL", type: "string", required: false, sensitive: false, default: "http://localhost:3000" }]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      perOperation: {
        registerAgent: { id: "pass_mock_1", fingerprint: "abc123", status: "active" },
        verifyPassport: { valid: true, status: "active" },
        getPassport: { id: "pass_mock_1", name: "Mock Agent", status: "active" },
        revokePassport: { success: true },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-kya-mandate",
    name: "KYA Agent Mandate",
    icon: "file-check",
    category: "kya",
    type: "http",
    description: "Create mandates and validate or record spend against agent budgets.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.cogniflowUrl}}/api/agents",
      authType: "none",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    operations: JSON.stringify([
      { id: "createMandate", name: "Create Mandate", method: "POST", path: "/{{passportId}}/mandate", bodyTemplate: { description: "{{description}}", maxAmountCents: "{{maxAmountCents}}", maxTotalSpendCents: "{{maxTotalSpendCents}}", allowedActions: "{{allowedActions}}", ttlSeconds: "{{ttlSeconds}}", workflowId: "{{workflowId}}" }, inputSchema: [{ key: "passportId", type: "string", required: true }, { key: "description", type: "string", required: true }, { key: "maxAmountCents", type: "number", required: false, default: 5000 }, { key: "maxTotalSpendCents", type: "number", required: false, default: 50000 }, { key: "allowedActions", type: "string", required: false }, { key: "ttlSeconds", type: "number", required: false }, { key: "workflowId", type: "string", required: false }] },
      { id: "validateAction", name: "Validate Action", method: "POST", path: "/mandates/{{mandateId}}/validate", bodyTemplate: { action: "{{action}}", amountCents: "{{amountCents}}" }, inputSchema: [{ key: "mandateId", type: "string", required: true }, { key: "action", type: "string", required: true }, { key: "amountCents", type: "number", required: false, default: 0 }] },
      { id: "recordSpend", name: "Record Spend", method: "POST", path: "/mandates/{{mandateId}}/spend", bodyTemplate: { amountCents: "{{amountCents}}", action: "{{action}}" }, inputSchema: [{ key: "mandateId", type: "string", required: true }, { key: "amountCents", type: "number", required: true }, { key: "action", type: "string", required: true }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "cogniflowUrl", label: "CogniFlow Base URL", type: "string", required: false, sensitive: false, default: "http://localhost:3000" }]),
    mockConfig: JSON.stringify({
      latencyMs: 80,
      perOperation: {
        createMandate: { id: "mand_mock_1", status: "active" },
        validateAction: { allowed: true, remaining: 4500 },
        recordSpend: { spentCents: 500, remaining: 4500, status: "active" },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-kya-monitor",
    name: "KYA Behavioral Monitor",
    icon: "activity",
    category: "kya",
    type: "http",
    description: "Run anomaly checks and log audit entries for agent behavior.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.cogniflowUrl}}/api/agents",
      authType: "none",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    operations: JSON.stringify([
      { id: "checkAnomaly", name: "Check Anomaly", method: "POST", path: "/{{passportId}}/anomaly-check", bodyTemplate: { action: "{{action}}", amountCents: "{{amountCents}}" }, inputSchema: [{ key: "passportId", type: "string", required: true }, { key: "action", type: "string", required: true }, { key: "amountCents", type: "number", required: false, default: 0 }] },
      { id: "logAudit", name: "Log Audit", method: "POST", path: "/{{passportId}}/audit", bodyTemplate: { action: "{{action}}", amountCents: "{{amountCents}}", status: "{{status}}" }, inputSchema: [{ key: "passportId", type: "string", required: true }, { key: "action", type: "string", required: true }, { key: "amountCents", type: "number", required: false }, { key: "status", type: "string", required: true }] },
      { id: "getAuditTrail", name: "Get Audit Trail", method: "GET", path: "/{{passportId}}/audit", queryTemplate: { limit: "{{limit}}" }, inputSchema: [{ key: "passportId", type: "string", required: true }, { key: "limit", type: "number", required: false, default: 50 }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "cogniflowUrl", label: "CogniFlow Base URL", type: "string", required: false, sensitive: false, default: "http://localhost:3000" }]),
    mockConfig: JSON.stringify({
      latencyMs: 60,
      perOperation: {
        checkAnomaly: { anomalyScore: 0.1, flags: [], autoRevoked: false },
        logAudit: { id: "audit_mock_1" },
        getAuditTrail: [],
      },
    }),
    isBuiltIn: true,
  },
] as const;

const idSet = new Set<string>(BUILT_IN_INTEGRATIONS.map((i) => i.id));

/** Return built-in integration definitions for the given IDs (only known built-in IDs are returned). */
export function getBuiltInIntegrationsByIds(integrationIds: string[]) {
  return BUILT_IN_INTEGRATIONS.filter((i) => integrationIds.includes(i.id));
}

/** Check if an id is a known built-in template id. */
export function isBuiltInId(id: string): boolean {
  return idSet.has(id);
}
