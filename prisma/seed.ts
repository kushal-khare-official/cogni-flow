import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as never);
}

const BUILT_IN_TEMPLATES = [
  {
    id: "tpl-stripe",
    name: "Stripe Payments",
    icon: "credit-card",
    category: "payments",
    type: "http",
    description: "Create payment intents, charges, and manage customers via Stripe API.",
    baseConfig: JSON.stringify({
      baseUrl: "https://api.stripe.com/v1",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    operations: JSON.stringify([
      {
        id: "createPaymentIntent",
        name: "Create Payment Intent",
        method: "POST",
        path: "/payment_intents",
        bodyTemplate: { amount: "{{amount}}", currency: "{{currency}}" },
        inputSchema: [
          { key: "amount", label: "Amount (cents)", type: "number", required: true },
          { key: "currency", label: "Currency", type: "string", required: true, default: "usd" },
        ],
      },
      {
        id: "retrievePaymentIntent",
        name: "Retrieve Payment Intent",
        method: "GET",
        path: "/payment_intents/{{paymentIntentId}}",
        inputSchema: [
          { key: "paymentIntentId", label: "Payment Intent ID", type: "string", required: true },
        ],
      },
      {
        id: "listCustomers",
        name: "List Customers",
        method: "GET",
        path: "/customers",
        inputSchema: [
          { key: "limit", label: "Limit", type: "number", required: false, default: 10 },
        ],
      },
      {
        id: "createCharge",
        name: "Create Charge",
        method: "POST",
        path: "/charges",
        bodyTemplate: { amount: "{{amount}}", currency: "{{currency}}", source: "{{source}}" },
        inputSchema: [
          { key: "amount", label: "Amount (cents)", type: "number", required: true },
          { key: "currency", label: "Currency", type: "string", required: true, default: "usd" },
          { key: "source", label: "Source Token", type: "string", required: true },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "Secret Key", type: "string", required: true, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      perOperation: {
        createPaymentIntent: { paymentIntentId: "pi_mock_123", status: "succeeded", amount: 1000, currency: "usd" },
        retrievePaymentIntent: { id: "pi_mock_123", status: "succeeded", amount: 1000 },
        listCustomers: { data: [{ id: "cus_mock_1", email: "test@example.com" }], has_more: false },
        createCharge: { id: "ch_mock_123", status: "succeeded", amount: 1000 },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-keycloak",
    name: "Keycloak IAM",
    icon: "shield",
    category: "identity",
    type: "http",
    description: "Manage authentication, users, and roles via Keycloak REST API.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.serverUrl}}",
      authType: "bearer",
    }),
    operations: JSON.stringify([
      {
        id: "getToken",
        name: "Get Access Token",
        method: "POST",
        path: "/realms/{{credential.realm}}/protocol/openid-connect/token",
        headersOverride: { "Content-Type": "application/x-www-form-urlencoded" },
        bodyTemplate: { grant_type: "client_credentials", client_id: "{{credential.clientId}}", client_secret: "{{credential.clientSecret}}" },
        inputSchema: [],
      },
      {
        id: "createUser",
        name: "Create User",
        method: "POST",
        path: "/admin/realms/{{credential.realm}}/users",
        bodyTemplate: { username: "{{username}}", email: "{{email}}", enabled: true },
        inputSchema: [
          { key: "username", label: "Username", type: "string", required: true },
          { key: "email", label: "Email", type: "string", required: true },
        ],
      },
      {
        id: "getUser",
        name: "Get User",
        method: "GET",
        path: "/admin/realms/{{credential.realm}}/users/{{userId}}",
        inputSchema: [
          { key: "userId", label: "User ID", type: "string", required: true },
        ],
      },
      {
        id: "introspectToken",
        name: "Introspect Token",
        method: "POST",
        path: "/realms/{{credential.realm}}/protocol/openid-connect/token/introspect",
        bodyTemplate: { token: "{{token}}", client_id: "{{credential.clientId}}", client_secret: "{{credential.clientSecret}}" },
        inputSchema: [
          { key: "token", label: "Token", type: "string", required: true },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "serverUrl", label: "Server URL", type: "string", required: true, sensitive: false },
      { key: "realm", label: "Realm", type: "string", required: true, sensitive: false },
      { key: "clientId", label: "Client ID", type: "string", required: true, sensitive: false },
      { key: "clientSecret", label: "Client Secret", type: "string", required: true, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 150,
      perOperation: {
        getToken: { access_token: "eyJ_mock_token", token_type: "Bearer", expires_in: 300 },
        createUser: { id: "usr-mock-123" },
        getUser: { id: "usr-mock-123", username: "testuser", email: "test@example.com", enabled: true },
        introspectToken: { active: true, sub: "usr-mock-123", username: "testuser" },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-salesforce",
    name: "Salesforce CRM",
    icon: "cloud",
    category: "crm",
    type: "http",
    description: "Query and manage Salesforce objects via REST API.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.instanceUrl}}/services/data/v59.0",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    operations: JSON.stringify([
      {
        id: "query",
        name: "SOQL Query",
        method: "GET",
        path: "/query?q={{soql}}",
        inputSchema: [
          { key: "soql", label: "SOQL Query", type: "string", required: true },
        ],
      },
      {
        id: "createRecord",
        name: "Create Record",
        method: "POST",
        path: "/sobjects/{{objectType}}",
        bodyTemplate: "{{recordData}}",
        inputSchema: [
          { key: "objectType", label: "Object Type", type: "string", required: true, default: "Lead" },
          { key: "recordData", label: "Record Data (JSON)", type: "string", required: true },
        ],
      },
      {
        id: "getRecord",
        name: "Get Record",
        method: "GET",
        path: "/sobjects/{{objectType}}/{{recordId}}",
        inputSchema: [
          { key: "objectType", label: "Object Type", type: "string", required: true },
          { key: "recordId", label: "Record ID", type: "string", required: true },
        ],
      },
      {
        id: "updateRecord",
        name: "Update Record",
        method: "PATCH",
        path: "/sobjects/{{objectType}}/{{recordId}}",
        bodyTemplate: "{{recordData}}",
        inputSchema: [
          { key: "objectType", label: "Object Type", type: "string", required: true },
          { key: "recordId", label: "Record ID", type: "string", required: true },
          { key: "recordData", label: "Record Data (JSON)", type: "string", required: true },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "instanceUrl", label: "Instance URL", type: "string", required: true, sensitive: false },
      { key: "accessToken", label: "Access Token", type: "string", required: true, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      perOperation: {
        query: { totalSize: 1, done: true, records: [{ Id: "001mock", Name: "Mock Record" }] },
        createRecord: { id: "001mock_new", success: true },
        getRecord: { Id: "001mock", Name: "Mock Record", Status: "Open" },
        updateRecord: { id: "001mock", success: true },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-sap",
    name: "SAP ERP",
    icon: "building",
    category: "erp",
    type: "http",
    description: "Interface with SAP ERP via OData REST endpoints.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.host}}/sap/opu/odata/sap",
      authType: "basic",
      defaultHeaders: { "sap-client": "{{credential.client}}", "Accept": "application/json" },
    }),
    operations: JSON.stringify([
      {
        id: "queryCollection",
        name: "Query Collection",
        method: "GET",
        path: "/{{servicePath}}/{{entitySet}}",
        inputSchema: [
          { key: "servicePath", label: "OData Service Path", type: "string", required: true },
          { key: "entitySet", label: "Entity Set", type: "string", required: true },
        ],
      },
      {
        id: "readEntity",
        name: "Read Entity",
        method: "GET",
        path: "/{{servicePath}}/{{entitySet}}('{{entityKey}}')",
        inputSchema: [
          { key: "servicePath", label: "OData Service Path", type: "string", required: true },
          { key: "entitySet", label: "Entity Set", type: "string", required: true },
          { key: "entityKey", label: "Entity Key", type: "string", required: true },
        ],
      },
      {
        id: "createEntity",
        name: "Create Entity",
        method: "POST",
        path: "/{{servicePath}}/{{entitySet}}",
        bodyTemplate: "{{entityData}}",
        inputSchema: [
          { key: "servicePath", label: "OData Service Path", type: "string", required: true },
          { key: "entitySet", label: "Entity Set", type: "string", required: true },
          { key: "entityData", label: "Entity Data (JSON)", type: "string", required: true },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "host", label: "Host URL", type: "string", required: true, sensitive: false },
      { key: "client", label: "SAP Client", type: "string", required: true, sensitive: false },
      { key: "user", label: "Username", type: "string", required: true, sensitive: false },
      { key: "password", label: "Password", type: "string", required: true, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 300,
      perOperation: {
        queryCollection: { d: { results: [{ DocumentNumber: "4500001", Status: "Open" }] } },
        readEntity: { d: { DocumentNumber: "4500001", Status: "Posted" } },
        createEntity: { d: { DocumentNumber: "4500002", Status: "Created" } },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-prometheus",
    name: "Prometheus Monitoring",
    icon: "activity",
    category: "monitoring",
    type: "http",
    description: "Query time-series metrics from Prometheus using PromQL.",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.endpoint}}/api/v1",
      authType: "none",
    }),
    operations: JSON.stringify([
      {
        id: "instantQuery",
        name: "Instant Query",
        method: "GET",
        path: "/query",
        queryTemplate: { query: "{{promql}}" },
        inputSchema: [
          { key: "promql", label: "PromQL Query", type: "string", required: true },
        ],
      },
      {
        id: "rangeQuery",
        name: "Range Query",
        method: "GET",
        path: "/query_range",
        queryTemplate: { query: "{{promql}}", start: "{{start}}", end: "{{end}}", step: "{{step}}" },
        inputSchema: [
          { key: "promql", label: "PromQL Query", type: "string", required: true },
          { key: "start", label: "Start Time", type: "string", required: true },
          { key: "end", label: "End Time", type: "string", required: true },
          { key: "step", label: "Step", type: "string", required: true, default: "15s" },
        ],
      },
      {
        id: "series",
        name: "Series",
        method: "GET",
        path: "/series",
        queryTemplate: { "match[]": "{{match}}" },
        inputSchema: [
          { key: "match", label: "Series Matcher", type: "string", required: true },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "endpoint", label: "Prometheus URL", type: "string", required: true, sensitive: false },
      { key: "bearerToken", label: "Bearer Token (optional)", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      perOperation: {
        instantQuery: { status: "success", data: { resultType: "vector", result: [{ metric: { __name__: "up" }, value: [1710000000, "1"] }] } },
        rangeQuery: { status: "success", data: { resultType: "matrix", result: [] } },
        series: { status: "success", data: [{ __name__: "up", job: "prometheus" }] },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-rpa",
    name: "RPA Bots",
    icon: "bot",
    category: "automation",
    type: "http",
    description: "Orchestrate RPA bot jobs via REST API (UiPath-compatible).",
    baseConfig: JSON.stringify({
      baseUrl: "{{credential.orchestratorUrl}}",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/json" },
    }),
    operations: JSON.stringify([
      {
        id: "startJob",
        name: "Start Job",
        method: "POST",
        path: "/odata/Jobs/UiPath.Server.Configuration.OData.StartJobs",
        bodyTemplate: { startInfo: { ReleaseKey: "{{releaseKey}}", Strategy: "Specific", InputArguments: "{{inputArgs}}" } },
        inputSchema: [
          { key: "releaseKey", label: "Release Key", type: "string", required: true },
          { key: "inputArgs", label: "Input Arguments (JSON)", type: "string", required: false },
        ],
      },
      {
        id: "getJobStatus",
        name: "Get Job Status",
        method: "GET",
        path: "/odata/Jobs({{jobId}})",
        inputSchema: [
          { key: "jobId", label: "Job ID", type: "string", required: true },
        ],
      },
      {
        id: "listProcesses",
        name: "List Processes",
        method: "GET",
        path: "/odata/Releases",
        inputSchema: [],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "orchestratorUrl", label: "Orchestrator URL", type: "string", required: true, sensitive: false },
      { key: "apiKey", label: "API Key", type: "string", required: true, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 500,
      perOperation: {
        startJob: { value: [{ Id: 12345, State: "Running", Key: "job-mock-123" }] },
        getJobStatus: { Id: 12345, State: "Successful", EndTime: "2025-01-01T12:00:00Z", OutputArguments: '{"result":"done"}' },
        listProcesses: { value: [{ Name: "InvoiceProcess", Key: "proc-mock-1" }] },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-mcp",
    name: "MCP Tools",
    icon: "wrench",
    category: "ai-tools",
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
    id: "tpl-custom-http",
    name: "Custom HTTP",
    icon: "globe",
    category: "custom",
    type: "http",
    description: "Make HTTP requests to any REST API endpoint.",
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
          { key: "body", label: "Request Body", type: "string", required: false },
        ],
      },
    ]),
    credentialSchema: JSON.stringify([
      { key: "apiKey", label: "API Key (optional)", type: "string", required: false, sensitive: true },
    ]),
    mockConfig: JSON.stringify({
      latencyMs: 100,
      defaultResponse: { status: 200, body: { message: "OK" } },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-custom-code",
    name: "Custom Code",
    icon: "code",
    category: "custom",
    type: "code",
    description: "Execute custom JavaScript code as a workflow step.",
    baseConfig: JSON.stringify({ runtime: "javascript" }),
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
];

const prisma = createClient();

async function main() {
  for (const tpl of BUILT_IN_TEMPLATES) {
    await prisma.integrationTemplate.upsert({
      where: { id: tpl.id },
      update: { ...tpl },
      create: { ...tpl },
    });
  }
  console.log(`Seeded ${BUILT_IN_TEMPLATES.length} integration templates.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
