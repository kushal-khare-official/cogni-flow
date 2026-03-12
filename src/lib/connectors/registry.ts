export interface ConnectorConfigField {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  default?: unknown;
}

export interface ConnectorDefinition {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  configFields: ConnectorConfigField[];
  inputSchema: Record<string, string>;
  outputSchema: Record<string, string>;
}

export const CONNECTOR_REGISTRY: Record<string, ConnectorDefinition> = {
  kafkaConnector: {
    id: "kafkaConnector",
    name: "Kafka Message Queue",
    icon: "kafka",
    category: "messaging",
    description:
      "Publish and consume messages from Apache Kafka topics with configurable consumer groups and partitioning.",
    configFields: [
      { key: "brokers", label: "Brokers", type: "string", required: true, default: "localhost:9092" },
      { key: "topic", label: "Topic", type: "string", required: true },
      { key: "groupId", label: "Consumer Group ID", type: "string", required: false, default: "cogniflow-group" },
    ],
    inputSchema: { message: "string", key: "string" },
    outputSchema: { topic: "string", partition: "number", offset: "number", timestamp: "string" },
  },

  postgresConnector: {
    id: "postgresConnector",
    name: "PostgreSQL Database",
    icon: "postgres",
    category: "database",
    description:
      "Execute SQL queries against a PostgreSQL database with parameterized query support.",
    configFields: [
      { key: "connectionString", label: "Connection String", type: "string", required: true, default: "postgresql://localhost:5432/cogniflow" },
      { key: "table", label: "Default Table", type: "string", required: false },
    ],
    inputSchema: { query: "string", params: "string" },
    outputSchema: { rows: "string", rowCount: "number", command: "string" },
  },

  stripeConnector: {
    id: "stripeConnector",
    name: "Stripe Payments",
    icon: "stripe",
    category: "payments",
    description:
      "Create payment intents, process charges, and manage subscriptions via the Stripe API.",
    configFields: [
      { key: "apiKey", label: "API Key", type: "string", required: true },
      { key: "webhookSecret", label: "Webhook Secret", type: "string", required: false },
    ],
    inputSchema: { amount: "number", currency: "string", customerId: "string" },
    outputSchema: { paymentIntentId: "string", status: "string", amount: "number", clientSecret: "string" },
  },

  salesforceConnector: {
    id: "salesforceConnector",
    name: "Salesforce CRM",
    icon: "salesforce",
    category: "crm",
    description:
      "Perform CRUD operations on Salesforce objects including leads, contacts, opportunities, and custom objects.",
    configFields: [
      { key: "instanceUrl", label: "Instance URL", type: "string", required: true },
      { key: "accessToken", label: "Access Token", type: "string", required: true },
    ],
    inputSchema: { objectType: "string", operation: "string", data: "string" },
    outputSchema: { id: "string", success: "string", fields: "string" },
  },

  sapConnector: {
    id: "sapConnector",
    name: "SAP ERP",
    icon: "sap",
    category: "erp",
    description:
      "Interface with SAP ERP modules for transaction processing, document posting, and master data management.",
    configFields: [
      { key: "host", label: "Host", type: "string", required: true },
      { key: "client", label: "Client", type: "string", required: true, default: "100" },
      { key: "user", label: "User", type: "string", required: true },
    ],
    inputSchema: { module: "string", transaction: "string", data: "string" },
    outputSchema: { documentNumber: "string", status: "string", messages: "string" },
  },

  keycloakConnector: {
    id: "keycloakConnector",
    name: "Keycloak Identity",
    icon: "keycloak",
    category: "identity",
    description:
      "Manage authentication flows, user sessions, and role-based access control through Keycloak.",
    configFields: [
      { key: "realm", label: "Realm", type: "string", required: true, default: "master" },
      { key: "serverUrl", label: "Server URL", type: "string", required: true },
      { key: "clientId", label: "Client ID", type: "string", required: true },
    ],
    inputSchema: { action: "string", userId: "string", credentials: "string" },
    outputSchema: { accessToken: "string", refreshToken: "string", userId: "string", roles: "string" },
  },

  prometheusConnector: {
    id: "prometheusConnector",
    name: "Prometheus Monitoring",
    icon: "prometheus",
    category: "monitoring",
    description:
      "Query time-series metrics from Prometheus using PromQL for monitoring and alerting workflows.",
    configFields: [
      { key: "endpoint", label: "Endpoint", type: "string", required: true, default: "http://localhost:9090" },
      { key: "scrapeInterval", label: "Scrape Interval (s)", type: "number", required: false, default: 15 },
    ],
    inputSchema: { query: "string", timeRange: "string" },
    outputSchema: { resultType: "string", values: "string", labels: "string" },
  },

  rpaConnector: {
    id: "rpaConnector",
    name: "RPA Bot",
    icon: "rpa",
    category: "automation",
    description:
      "Orchestrate robotic process automation bots for UI-driven tasks, data entry, and legacy system integration.",
    configFields: [
      { key: "botId", label: "Bot ID", type: "string", required: true },
      { key: "runtime", label: "Runtime", type: "string", required: false, default: "unattended" },
      { key: "schedule", label: "Schedule (cron)", type: "string", required: false },
    ],
    inputSchema: { processName: "string", inputData: "string", priority: "string" },
    outputSchema: { executionId: "string", status: "string", steps: "string", outputData: "string" },
  },
};
