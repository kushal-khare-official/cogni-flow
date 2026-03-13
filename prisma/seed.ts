import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as never);
}

const REMOVED_TEMPLATE_IDS = [
  "tpl-stripe",
  "tpl-keycloak",
  "tpl-salesforce",
  "tpl-sap",
  "tpl-prometheus",
  "tpl-rpa",
];

const BUILT_IN_TEMPLATES = [
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
    operations: JSON.stringify([
      {
        id: "request",
        name: "HTTP Request",
        method: "GET",
        path: "/",
        inputSchema: [
          { key: "url", label: "URL (overrides base)", type: "string", required: false },
          { key: "method", label: "Method", type: "string", required: false, default: "GET" },
          { key: "body", label: "Request Body (JSON)", type: "string", required: false },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "API Key / Bearer Token", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 150,
      defaultResponse: { status: 200, body: { message: "OK" } },
    }),
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
    operations: JSON.stringify([
      {
        id: "callWithCallback",
        name: "Call with Webhook Callback",
        method: "POST",
        path: "/",
        bodyTemplate: { callbackUrl: "{{callbackUrl}}" },
        inputSchema: [
          { key: "url", label: "Target URL", type: "string", required: true },
          { key: "body", label: "Request Body (JSON)", type: "string", required: false },
          { key: "callbackUrl", label: "Callback URL (auto-generated)", type: "string", required: false },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "API Key / Bearer Token", type: "string", required: false, sensitive: true },
      { key: "webhookSecret", label: "Webhook Secret", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      defaultResponse: { accepted: true, callbackId: "cb_mock_123" },
    }),
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
    operations: JSON.stringify([]),
    credentialSchema: JSON.stringify([]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      defaultResponse: { result: "Mock MCP tool response" },
    }),
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
    operations: JSON.stringify([
      {
        id: "execute",
        name: "Execute Code",
        codeTemplate: "// Access upstream node outputs via ctx\n// Return a value to pass downstream\nreturn { result: 'hello' };",
        inputSchema: [],
      },
    ]),
    credentialSchema: JSON.stringify([]),
    mockConfig: JSON.stringify({
      latencyMs: 50,
      defaultResponse: { result: "mock code output" },
    }),
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
    operations: JSON.stringify([
      {
        id: "consume",
        name: "Consume Messages",
        inputSchema: [
          { key: "topic", label: "Topic", type: "string", required: true },
          { key: "groupId", label: "Consumer Group ID", type: "string", required: true },
          { key: "brokers", label: "Brokers (comma-separated)", type: "string", required: true, default: "localhost:9092" },
          { key: "fromBeginning", label: "From Beginning", type: "boolean", required: false, default: false },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "saslUsername", label: "SASL Username", type: "string", required: false, sensitive: false },
      { key: "saslPassword", label: "SASL Password", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      defaultResponse: { topic: "test-topic", partition: 0, offset: "42", value: { orderId: "ord-123", amount: 99.99 } },
    }),
    isBuiltIn: true,
  },
];

const prisma = createClient();

async function main() {
  await prisma.integrationTemplate.deleteMany({
    where: { id: { in: REMOVED_TEMPLATE_IDS } },
  });
  // Also remove the old IDs that were renamed
  await prisma.integrationTemplate.deleteMany({
    where: { id: { in: ["tpl-mcp", "tpl-custom-http"] } },
  });

  for (const tpl of BUILT_IN_TEMPLATES) {
    await prisma.integrationTemplate.upsert({
      where: { id: tpl.id },
      update: { ...tpl },
      create: { ...tpl },
    });
  }
  console.log(`Seeded ${BUILT_IN_TEMPLATES.length} integrations (removed ${REMOVED_TEMPLATE_IDS.length} legacy ones).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
