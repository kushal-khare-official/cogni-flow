import type { JsonSchema } from "./schema";

export interface PlatformTool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export const PLATFORM_TOOLS: PlatformTool[] = [
  {
    name: "list_workflows",
    description:
      "List all available workflows with their id, name, description, and status. Optionally filter by status (draft, shadow, live).",
    inputSchema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          description:
            'Filter by workflow status: "draft", "shadow", or "live". Omit to return all.',
        },
      },
    },
  },
  {
    name: "get_workflow_schema",
    description:
      "Return the input and output schema for a workflow. The input schema comes from the start node's requestBody; the output schema comes from the end node's responseMapping and outputSchema.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "The workflow ID to inspect.",
        },
      },
      required: ["workflowId"],
    },
  },
  {
    name: "get_execution_history",
    description:
      "Query past execution runs. Optionally filter by workflowId and paginate with limit/offset.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "Filter runs by workflow ID.",
        },
        limit: {
          type: "number",
          description: "Max results to return (default 20, max 100).",
        },
        offset: {
          type: "number",
          description: "Number of results to skip (default 0).",
        },
      },
    },
  },
  {
    name: "validate_workflow",
    description:
      "Run validation on a published workflow with test inputs. Returns pass/fail results, execution traces, and branch coverage for each test case.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "The workflow ID to validate.",
        },
        testInputs: {
          type: "array",
          description:
            'Array of test cases, each with { "name": "...", "data": { ... } }.',
        },
      },
      required: ["workflowId", "testInputs"],
    },
  },
  {
    name: "dry_run_workflow",
    description:
      "Execute a workflow in mock mode (no real external calls). Returns the execution trace and context without side effects.",
    inputSchema: {
      type: "object",
      properties: {
        workflowId: {
          type: "string",
          description: "The workflow ID to dry-run.",
        },
        input: {
          type: "object",
          description: "Input data to pass to the workflow start node.",
        },
      },
      required: ["workflowId"],
    },
  },
  {
    name: "generate_workflow",
    description:
      "Generate a BPMN workflow from a natural language description using AI. Returns nodes, edges, and any newly created integrations. The workflow is NOT automatically saved — use the returned data to create it.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description:
            "Natural language description of the workflow to generate.",
        },
        provider: {
          type: "string",
          description:
            'AI provider to use: "openai", "anthropic", or "google". Defaults to first available.',
        },
      },
      required: ["prompt"],
    },
  },
];

export function isPlatformTool(name: string): boolean {
  return PLATFORM_TOOLS.some((t) => t.name === name);
}
