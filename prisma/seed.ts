import { PrismaClient } from "../src/generated/prisma/client.js";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

function createClient() {
  const dbPath = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbPath });
  return new PrismaClient({ adapter } as never);
}

const BUILT_IN_INTEGRATIONS = [
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
  // ─── KYA (Know Your Agent) templates ───
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
      { id: "recordSpend", name: "Record Spend", method: "POST", path: "/mandates/{{mandateId}}/spend", bodyTemplate: { amountCents: "{{amountCents}}", action: "{{action}}", stripeObjectId: "{{stripeObjectId}}" }, inputSchema: [{ key: "mandateId", type: "string", required: true }, { key: "amountCents", type: "number", required: true }, { key: "action", type: "string", required: true }, { key: "stripeObjectId", type: "string", required: false }] },
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
  // ─── Stripe (expanded + new) ───
  {
    id: "tpl-stripe",
    name: "Stripe Payments",
    icon: "credit-card",
    category: "payments",
    type: "http",
    description: "Create payment intents, refunds, payment links, products, and manage customers via Stripe API.",
    baseConfig: JSON.stringify({
      baseUrl: "https://api.stripe.com/v1",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    operations: JSON.stringify([
      { id: "createPaymentIntent", name: "Create Payment Intent", method: "POST", path: "/payment_intents", bodyTemplate: { amount: "{{amount}}", currency: "{{currency}}" }, inputSchema: [{ key: "amount", label: "Amount (cents)", type: "number", required: true }, { key: "currency", label: "Currency", type: "string", required: true, default: "usd" }] },
      { id: "retrievePaymentIntent", name: "Retrieve Payment Intent", method: "GET", path: "/payment_intents/{{paymentIntentId}}", inputSchema: [{ key: "paymentIntentId", label: "Payment Intent ID", type: "string", required: true }] },
      { id: "listCustomers", name: "List Customers", method: "GET", path: "/customers", inputSchema: [{ key: "limit", label: "Limit", type: "number", required: false, default: 10 }] },
      { id: "createCharge", name: "Create Charge", method: "POST", path: "/charges", bodyTemplate: { amount: "{{amount}}", currency: "{{currency}}", source: "{{source}}" }, inputSchema: [{ key: "amount", label: "Amount (cents)", type: "number", required: true }, { key: "currency", label: "Currency", type: "string", required: true, default: "usd" }, { key: "source", label: "Source Token", type: "string", required: true }] },
      { id: "createRefund", name: "Create Refund", method: "POST", path: "/refunds", bodyTemplate: { payment_intent: "{{payment_intent}}", amount: "{{amount}}", reason: "{{reason}}" }, inputSchema: [{ key: "payment_intent", label: "Payment Intent ID", type: "string", required: true }, { key: "amount", label: "Amount (cents)", type: "number", required: false }, { key: "reason", label: "Reason", type: "string", required: false }] },
      { id: "createPaymentLink", name: "Create Payment Link", method: "POST", path: "/payment_links", bodyTemplate: { "line_items[0][price_data][currency]": "{{currency}}", "line_items[0][price_data][unit_amount]": "{{amount}}", "line_items[0][quantity]": "1" }, inputSchema: [{ key: "amount", label: "Amount (cents)", type: "number", required: true }, { key: "currency", label: "Currency", type: "string", required: true, default: "usd" }] },
      { id: "createProduct", name: "Create Product", method: "POST", path: "/products", bodyTemplate: { name: "{{name}}", description: "{{description}}" }, inputSchema: [{ key: "name", label: "Product Name", type: "string", required: true }, { key: "description", label: "Description", type: "string", required: false }] },
      { id: "createPrice", name: "Create Price", method: "POST", path: "/prices", bodyTemplate: { product: "{{product}}", unit_amount: "{{unit_amount}}", currency: "{{currency}}" }, inputSchema: [{ key: "product", label: "Product ID", type: "string", required: true }, { key: "unit_amount", label: "Unit Amount (cents)", type: "number", required: true }, { key: "currency", label: "Currency", type: "string", required: true, default: "usd" }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "apiKey", label: "Secret Key", type: "string", required: true, sensitive: true }]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      perOperation: {
        createPaymentIntent: { paymentIntentId: "pi_mock_123", status: "succeeded", amount: 1000, currency: "usd" },
        retrievePaymentIntent: { id: "pi_mock_123", status: "succeeded", amount: 1000 },
        listCustomers: { data: [{ id: "cus_mock_1", email: "test@example.com" }], has_more: false },
        createCharge: { id: "ch_mock_123", status: "succeeded", amount: 1000 },
        createRefund: { id: "re_mock_123", status: "succeeded" },
        createPaymentLink: { url: "https://buy.stripe.com/mock", id: "plink_mock" },
        createProduct: { id: "prod_mock_1", name: "Test Product" },
        createPrice: { id: "price_mock_1", unit_amount: 1000, currency: "usd" },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-stripe-issuing",
    name: "Stripe Issuing (Virtual Cards)",
    icon: "credit-card",
    category: "payments",
    type: "http",
    description: "Create cardholders and virtual cards, get or cancel cards via Stripe Issuing API.",
    baseConfig: JSON.stringify({
      baseUrl: "https://api.stripe.com/v1",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    operations: JSON.stringify([
      { id: "createCardholder", name: "Create Cardholder", method: "POST", path: "/issuing/cardholders", bodyTemplate: { name: "{{name}}", type: "individual", "billing[address][line1]": "{{line1}}", "billing[address][country]": "{{country}}" }, inputSchema: [{ key: "name", type: "string", required: true }, { key: "line1", type: "string", required: true }, { key: "country", type: "string", required: true, default: "US" }] },
      { id: "createVirtualCard", name: "Create Virtual Card", method: "POST", path: "/issuing/cards", bodyTemplate: { cardholder: "{{cardholder}}", type: "virtual" }, inputSchema: [{ key: "cardholder", label: "Cardholder ID", type: "string", required: true }] },
      { id: "getCard", name: "Get Card", method: "GET", path: "/issuing/cards/{{cardId}}", inputSchema: [{ key: "cardId", type: "string", required: true }] },
      { id: "cancelCard", name: "Cancel Card", method: "POST", path: "/issuing/cards/{{cardId}}", bodyTemplate: { status: "inactive" }, inputSchema: [{ key: "cardId", type: "string", required: true }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "apiKey", label: "Secret Key", type: "string", required: true, sensitive: true }]),
    mockConfig: JSON.stringify({
      latencyMs: 250,
      perOperation: {
        createCardholder: { id: "ich_mock_1", name: "Mock Cardholder" },
        createVirtualCard: { id: "ic_mock_1", last4: "4242", status: "active" },
        getCard: { id: "ic_mock_1", last4: "4242", status: "active" },
        cancelCard: { id: "ic_mock_1", status: "inactive" },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-stripe-billing",
    name: "Stripe Billing",
    icon: "receipt",
    category: "payments",
    type: "http",
    description: "Create meter events, subscriptions, and invoices for metered/usage-based billing.",
    baseConfig: JSON.stringify({
      baseUrl: "https://api.stripe.com/v1",
      authType: "bearer",
      defaultHeaders: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
    operations: JSON.stringify([
      { id: "createMeterEvent", name: "Create Meter Event", method: "POST", path: "/billing/meter_events", bodyTemplate: { event_name: "{{event_name}}", payload: "{{payload}}" }, inputSchema: [{ key: "event_name", type: "string", required: true }, { key: "payload", type: "string", required: true }] },
      { id: "createSubscription", name: "Create Subscription", method: "POST", path: "/subscriptions", bodyTemplate: { customer: "{{customer}}", "items[0][price]": "{{price}}" }, inputSchema: [{ key: "customer", type: "string", required: true }, { key: "price", type: "string", required: true }] },
      { id: "createInvoice", name: "Create Invoice", method: "POST", path: "/invoices", bodyTemplate: { customer: "{{customer}}" }, inputSchema: [{ key: "customer", type: "string", required: true }] },
      { id: "listInvoices", name: "List Invoices", method: "GET", path: "/invoices", inputSchema: [{ key: "limit", type: "number", required: false, default: 10 }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "apiKey", label: "Secret Key", type: "string", required: true, sensitive: true }]),
    mockConfig: JSON.stringify({
      latencyMs: 200,
      perOperation: {
        createMeterEvent: { event_name: "tokens_used", timestamp: "2025-01-01T00:00:00Z" },
        createSubscription: { id: "sub_mock_1", status: "active" },
        createInvoice: { id: "in_mock_1", status: "draft" },
        listInvoices: { data: [], has_more: false },
      },
    }),
    isBuiltIn: true,
  },
  {
    id: "tpl-stripe-agent-toolkit",
    name: "Stripe Agent Toolkit",
    icon: "bot",
    category: "payments",
    type: "stripe_agent",
    description: "Execute Stripe actions via the agent toolkit (payment intents, refunds, payment links, products) for agentic payment workflows.",
    baseConfig: JSON.stringify({ allowedActions: ["createPaymentIntent", "retrievePaymentIntent", "createRefund", "createPaymentLink", "createProduct", "createPrice", "listCustomers", "listPrices"] }),
    operations: JSON.stringify([
      { id: "createPaymentIntent", name: "Create Payment Intent", inputSchema: [{ key: "amount", type: "number", required: true }, { key: "currency", type: "string", required: true, default: "usd" }] },
      { id: "retrievePaymentIntent", name: "Retrieve Payment Intent", inputSchema: [{ key: "paymentIntentId", type: "string", required: true }] },
      { id: "listCustomers", name: "List Customers", inputSchema: [{ key: "limit", type: "number", required: false, default: 10 }] },
      { id: "createRefund", name: "Create Refund", inputSchema: [{ key: "payment_intent", type: "string", required: true }, { key: "amount", type: "number", required: false }, { key: "reason", type: "string", required: false }] },
      { id: "createPaymentLink", name: "Create Payment Link", inputSchema: [{ key: "amount", type: "number", required: true }, { key: "currency", type: "string", required: true, default: "usd" }, { key: "name", type: "string", required: false }, { key: "description", type: "string", required: false }] },
      { id: "createProduct", name: "Create Product", inputSchema: [{ key: "name", type: "string", required: true }, { key: "description", type: "string", required: false }] },
      { id: "createPrice", name: "Create Price", inputSchema: [{ key: "product", type: "string", required: true }, { key: "unit_amount", type: "number", required: true }, { key: "currency", type: "string", required: true, default: "usd" }] },
      { id: "listPrices", name: "List Prices", inputSchema: [{ key: "limit", type: "number", required: false, default: 10 }, { key: "product", type: "string", required: false }] },
    ]),
    credentialSchema: JSON.stringify([{ key: "apiKey", label: "Stripe Secret Key (or Restricted Key)", type: "string", required: true, sensitive: true }]),
    mockConfig: JSON.stringify({
      latencyMs: 150,
      perOperation: {
        createPaymentIntent: { id: "pi_mock_123", status: "requires_payment_method", client_secret: "pi_mock_secret" },
        retrievePaymentIntent: { id: "pi_mock_123", status: "succeeded", amount: 1000 },
        listCustomers: { data: [], has_more: false },
        createRefund: { id: "re_mock_123", status: "succeeded" },
        createPaymentLink: { id: "plink_mock", url: "https://buy.stripe.com/mock" },
        createProduct: { id: "prod_mock_1", name: "Test" },
        createPrice: { id: "price_mock_1", unit_amount: 1000, currency: "usd" },
        listPrices: { data: [], has_more: false },
      },
    }),
    isBuiltIn: true,
  },
];

const prisma = createClient();

async function main() {
  for (const integration of BUILT_IN_INTEGRATIONS) {
    await prisma.integration.upsert({
      where: { id: integration.id },
      update: { ...integration },
      create: { ...integration },
    });
  }
  console.log(`Seeded ${BUILT_IN_INTEGRATIONS.length} integrations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
