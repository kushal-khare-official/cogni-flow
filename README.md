# CogniFlow

A visual BPMN workflow automation platform with AI-assisted design, a multi-step execution engine, and an MCP server that exposes every published workflow as a tool any AI agent can call.

## Getting Started

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to launch the workflow editor.

### Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/cogniflow"

# At least one AI provider key is required for workflow generation
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
```

## MCP Server

CogniFlow exposes an MCP server so that AI agents (Claude Desktop, Cursor, LangChain, etc.) can discover and call your workflows as tools. Every workflow published as **live** or **shadow** appears automatically — no code changes needed.

The server also provides platform utility tools for listing workflows, inspecting schemas, querying execution history, running validations, dry-running in mock mode, and generating new workflows from natural language.

### Available Tools

#### Platform tools (always present)

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows, optionally filtered by status |
| `get_workflow_schema` | Return the input/output schema for a workflow |
| `get_execution_history` | Query past execution runs with pagination |
| `validate_workflow` | Run test cases against a workflow and get pass/fail + coverage |
| `dry_run_workflow` | Execute a workflow in mock mode (no real external calls) |
| `generate_workflow` | Generate a BPMN workflow from a natural language prompt |

#### Dynamic workflow tools (one per published workflow)

Each workflow with status `live` or `shadow` is registered as a tool named `<slugified_name>_<id_prefix>` (e.g. `process_refund_cm3x8k`). The tool's `inputSchema` is derived from the workflow's start node `requestBody` definition. Calling the tool executes the full workflow and returns the result.

### Transport: Streamable HTTP

The MCP server is available at the `/api/mcp` endpoint of your running Next.js app. Point any MCP client that supports Streamable HTTP to:

```
http://localhost:3000/api/mcp
```

No session management is required — the server runs in stateless mode.

### Transport: stdio (for Claude Desktop, Cursor, etc.)

For AI clients that connect via stdio, run the standalone MCP server:

```bash
npm run mcp:serve
```

This starts a process that reads/writes MCP JSON-RPC messages over stdin/stdout. It requires `DATABASE_URL` to be set (reads from `.env` automatically).

#### Claude Desktop configuration

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cogni-flow": {
      "command": "npx",
      "args": ["tsx", "src/mcp-stdio.ts"],
      "cwd": "C:\\Users\\you\\path\\to\\cogni-flow",
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/cogniflow"
      }
    }
  }
}
```

> **Windows users:** The `cwd` value must be an absolute path (e.g. `C:\\Users\\you\\...`). Tilde (`~`) expansion does not work in JSON config files on Windows.

#### Cursor configuration

Add to your Cursor MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "cogni-flow": {
      "command": "npx",
      "args": ["tsx", "src/mcp-stdio.ts"],
      "cwd": "C:\\Users\\you\\path\\to\\cogni-flow",
      "env": {
        "DATABASE_URL": "postgresql://user:password@localhost:5432/cogniflow"
      }
    }
  }
}
```

### Example: Calling a Workflow Tool

Once connected, an AI agent can discover and call workflow tools:

```
Agent: "Process a refund for order 123"
→ tools/list discovers: process_refund_cm3x8k
→ tools/call("process_refund_cm3x8k", { "orderId": "123", "reason": "defective" })
→ CogniFlow runs the 10-node workflow (verify order → check policy → call payment API → send email)
→ Returns: { "refundId": "R-456", "status": "approved", "amount": 29.99 }
```

### Example: Using Platform Tools

```
Agent: "What workflows are available?"
→ tools/call("list_workflows", { "status": "live" })
→ Returns list of published workflows with IDs and descriptions

Agent: "Dry-run the shipping quote workflow with test data"
→ tools/call("dry_run_workflow", { "workflowId": "abc123", "input": { "itemId": "X1", "zip": "10001" } })
→ Returns mock execution trace and output without side effects

Agent: "Create a workflow that checks inventory and sends a quote email"
→ tools/call("generate_workflow", { "prompt": "Check inventory for an item, calculate shipping cost, send a quote email to the customer" })
→ Returns generated BPMN nodes and edges ready to save
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the development server |
| `npm run build` | Generate Prisma client and build for production |
| `npm start` | Start the production server |
| `npm run db:push` | Push the Prisma schema to the database |
| `npm run db:seed` | Seed the database with built-in integrations |
| `npm run mcp:serve` | Start the MCP server over stdio |

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **UI:** React 19, React Flow, Tailwind CSS 4, shadcn
- **Database:** PostgreSQL via Prisma 7
- **AI:** Vercel AI SDK (OpenAI, Anthropic, Google)
- **MCP:** @modelcontextprotocol/sdk
- **BPMN:** bpmn-moddle
