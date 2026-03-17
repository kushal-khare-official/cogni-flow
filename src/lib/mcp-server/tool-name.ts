export function workflowToToolName(name: string, id: string): string {
  const slug =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "workflow";
  return `${slug}_${id.slice(0, 6)}`;
}

export function extractWorkflowId(toolName: string): string | null {
  const lastUnderscore = toolName.lastIndexOf("_");
  if (lastUnderscore === -1) return null;
  return toolName.slice(lastUnderscore + 1);
}
