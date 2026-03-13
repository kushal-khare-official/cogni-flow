"use client";

import { useEffect } from "react";
import { SlidersHorizontal, Trash2, Plus, X } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useIntegrationStore } from "@/lib/store/integration-store";
import { getNodeIcon } from "@/lib/node-icons";
import {
  NODE_TYPE_LABELS,
  getNodeCategory,
  type BpmnNodeData,
  BpmnNodeType,
} from "@/lib/workflow/types";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EXECUTABLE_CATEGORIES = new Set(["tasks", "integrations", "actions"]);

const NODE_TYPE_FILTER: Partial<Record<BpmnNodeType, string>> = {
  [BpmnNodeType.ScriptTask]: "code",
  [BpmnNodeType.ReceiveTask]: "webhook",
};

const IO_TYPES = ["string", "number", "boolean", "object", "array"] as const;

interface IoField {
  key: string;
  type: string;
  description?: string;
}

interface OperationDef {
  id: string;
  name: string;
  method?: string;
  path?: string;
  bodyTemplate?: unknown;
  queryTemplate?: Record<string, string>;
  headersOverride?: Record<string, string>;
  toolName?: string;
  codeTemplate?: string;
  inputSchema?: { key: string; label: string; type: string; required: boolean }[];
}

export function NodeInspector() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const templates = useIntegrationStore((s) => s.templates);
  const fetchTemplates = useIntegrationStore((s) => s.fetchTemplates);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100">
          <SlidersHorizontal className="size-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-700">No node selected</p>
          <p className="mt-1 text-xs text-zinc-400">
            Select a node on the canvas to inspect and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const data = node.data;
  const Icon = getNodeIcon(data.bpmnType);
  const category = getNodeCategory(data.bpmnType);
  const isGateway = category === "gateways";
  const canUseIntegration = EXECUTABLE_CATEGORIES.has(category);

  const typeFilter = NODE_TYPE_FILTER[data.bpmnType];
  const filteredTemplates = typeFilter
    ? templates.filter((t) => t.type === typeFilter)
    : templates;

  const selectedTemplate = data.integrationTemplateId
    ? templates.find((t) => t.id === data.integrationTemplateId)
    : undefined;

  const templateType = selectedTemplate?.type;

  const operations: OperationDef[] = selectedTemplate
    ? (JSON.parse(selectedTemplate.operations || "[]") as OperationDef[])
    : [];

  const selectedOperation = data.operationId
    ? operations.find((o) => o.id === data.operationId)
    : undefined;

  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const expectedInputs = ((data.expectedInputs ?? []) as IoField[]);
  const expectedOutputs = ((data.expectedOutputs ?? []) as IoField[]);

  function update(patch: Partial<BpmnNodeData>) {
    if (selectedNodeId) updateNodeData(selectedNodeId, patch);
  }

  function handleDelete() {
    if (!selectedNodeId) return;
    deleteNode(selectedNodeId);
    selectNode(null);
  }

  function addIoField(direction: "expectedInputs" | "expectedOutputs") {
    const current = (data[direction] ?? []) as IoField[];
    update({ [direction]: [...current, { key: "", type: "string", description: "" }] });
  }

  function updateIoField(direction: "expectedInputs" | "expectedOutputs", idx: number, patch: Partial<IoField>) {
    const current = [...(data[direction] ?? []) as IoField[]];
    current[idx] = { ...current[idx], ...patch };
    update({ [direction]: current });
  }

  function removeIoField(direction: "expectedInputs" | "expectedOutputs", idx: number) {
    const current = [...(data[direction] ?? []) as IoField[]];
    current.splice(idx, 1);
    update({ [direction]: current });
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
            <Icon className="size-4 text-zinc-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-800">
              {data.label}
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {NODE_TYPE_LABELS[data.bpmnType]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          className="shrink-0 text-zinc-400 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Separator />

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Label</Label>
        <Input
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          className="text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Description</Label>
        <Textarea
          value={data.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Add a description…"
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Gateway conditions */}
      {isGateway && outgoingEdges.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Conditions</Label>
            {outgoingEdges.map((edge) => {
              const targetNode = nodes.find((n) => n.id === edge.target);
              const conditionEntry = data.conditions?.find(
                (c) => c.edgeId === edge.id,
              );
              return (
                <div key={edge.id} className="space-y-1">
                  <p className="text-[11px] text-zinc-400">
                    → {targetNode?.data.label ?? edge.target}
                  </p>
                  <Input
                    value={conditionEntry?.expression ?? ""}
                    onChange={(e) => {
                      const existing = data.conditions ?? [];
                      const idx = existing.findIndex(
                        (c) => c.edgeId === edge.id,
                      );
                      const updated = [...existing];
                      if (idx >= 0) {
                        updated[idx] = { ...updated[idx], expression: e.target.value };
                      } else {
                        updated.push({ edgeId: edge.id, expression: e.target.value });
                      }
                      update({ conditions: updated });
                    }}
                    placeholder="e.g. {{node-1.amount}} > 100"
                    className="text-xs"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Integration config */}
      {canUseIntegration && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Integration</Label>

            {/* Template selector */}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Template</Label>
              <Select
                value={data.integrationTemplateId ?? ""}
                onValueChange={(val) =>
                  update({
                    integrationTemplateId: val ?? undefined,
                    operationId: undefined,
                    inputMapping: undefined,
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select integration…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">
                    <span className="text-zinc-400">None</span>
                  </SelectItem>
                  {filteredTemplates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-1.5">
                        {t.name}
                        <Badge variant="outline" className="ml-1 text-[9px] font-normal">
                          {t.type}
                        </Badge>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <>
                {/* Operation selector */}
                {operations.length > 1 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-zinc-500">Operation</Label>
                    <Select
                      value={data.operationId ?? ""}
                      onValueChange={(val) => update({ operationId: val ?? undefined })}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select operation…" />
                      </SelectTrigger>
                      <SelectContent>
                        {operations.map((op) => (
                          <SelectItem key={op.id} value={op.id}>
                            {op.name}
                            {op.method && (
                              <Badge variant="outline" className="ml-1.5 text-[9px] font-mono">{op.method}</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Template summary (read-only) */}
                <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-500">
                  <span className="font-medium text-zinc-600">{selectedTemplate.name}</span>
                  <span className="mx-1">·</span>
                  <Badge variant="outline" className="text-[9px]">{selectedTemplate.type}</Badge>
                  {templateType === "http" && selectedOperation?.method && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="font-mono">{selectedOperation.method} {selectedOperation.path}</span>
                    </>
                  )}
                  {templateType === "code" && (
                    <>
                      <span className="mx-1">·</span>
                      <span>{(() => { try { return JSON.parse(selectedTemplate.baseConfig)?.language ?? "javascript"; } catch { return "javascript"; } })()}</span>
                    </>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    Edit integration properties via the Integrations button in the top bar.
                  </p>
                </div>

                {/* Webhook properties */}
                {templateType === "webhook" && (
                  <WebhookProperties data={data} />
                )}

                {/* Input mapping from operation schema */}
                {selectedOperation?.inputSchema && selectedOperation.inputSchema.length > 0 && (
                  <>
                    <Separator />
                    <Label className="text-xs text-zinc-500">Input Mapping</Label>
                    {selectedOperation.inputSchema.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-[11px] text-zinc-400">
                          {field.label}
                          {field.required && <span className="ml-0.5 text-red-400">*</span>}
                        </Label>
                        <Input
                          value={data.inputMapping?.[field.key] ?? ""}
                          onChange={(e) => {
                            update({
                              inputMapping: {
                                ...data.inputMapping,
                                [field.key]: e.target.value,
                              },
                            });
                          }}
                          placeholder={`e.g. {{node-1.${field.key}}} or literal value`}
                          className="text-xs"
                        />
                      </div>
                    ))}
                  </>
                )}

                {/* Credential picker */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-500">Credential</Label>
                  <Input
                    value={(data.credentialId as string) ?? ""}
                    onChange={(e) => update({ credentialId: e.target.value })}
                    placeholder="Credential ID (from Credentials dialog)"
                    className="text-xs"
                  />
                </div>
              </>
            )}
          </div>

          {/* Expected Inputs / Outputs */}
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Expected Inputs</Label>
            {expectedInputs.map((field, idx) => (
              <IoFieldRow
                key={idx}
                field={field}
                onChange={(patch) => updateIoField("expectedInputs", idx, patch)}
                onRemove={() => removeIoField("expectedInputs", idx)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={() => addIoField("expectedInputs")} className="gap-1 text-[10px]">
              <Plus className="size-3" /> Add Input
            </Button>
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Expected Outputs</Label>
            {expectedOutputs.map((field, idx) => (
              <IoFieldRow
                key={idx}
                field={field}
                onChange={(patch) => updateIoField("expectedOutputs", idx, patch)}
                onRemove={() => removeIoField("expectedOutputs", idx)}
              />
            ))}
            <Button variant="outline" size="sm" onClick={() => addIoField("expectedOutputs")} className="gap-1 text-[10px]">
              <Plus className="size-3" /> Add Output
            </Button>
          </div>
        </>
      )}

      {/* Threshold */}
      {data.threshold !== undefined && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Threshold</Label>
            <Input type="number" step="0.01" value={data.threshold} onChange={(e) => update({ threshold: Number(e.target.value) })} className="text-sm" />
          </div>
        </>
      )}

      {/* Confidence Score */}
      {data.confidenceScore !== undefined && (
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Confidence Score</Label>
          <Input type="number" step="0.01" min={0} max={1} value={data.confidenceScore} onChange={(e) => update({ confidenceScore: Number(e.target.value) })} className="text-sm" />
        </div>
      )}

      {/* Input Features */}
      {data.inputFeatures !== undefined && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              Input Features <span className="font-normal text-zinc-400">(comma-separated)</span>
            </Label>
            <Input
              value={(data.inputFeatures ?? []).join(", ")}
              onChange={(e) =>
                update({ inputFeatures: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })
              }
              placeholder="feature1, feature2"
              className="text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}

function IoFieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: IoField;
  onChange: (patch: Partial<IoField>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Input
        value={field.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder="field name"
        className="h-7 flex-1 text-xs"
      />
      <Select value={field.type} onValueChange={(v) => onChange({ type: v ?? "string" })}>
        <SelectTrigger className="h-7 w-24 shrink-0 text-[10px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {IO_TYPES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        value={field.description ?? ""}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="description"
        className="h-7 flex-1 text-xs"
      />
      <Button variant="ghost" size="icon-sm" onClick={onRemove} className="shrink-0 text-zinc-400 hover:text-red-500">
        <X className="size-3" />
      </Button>
    </div>
  );
}

function WebhookProperties({ data }: { data: BpmnNodeData }) {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookPath = data.webhookPath as string | undefined;

  return (
    <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        Webhook Properties
      </p>
      {webhookPath ? (
        <div className="space-y-1">
          <Label className="text-[11px] text-zinc-500">Webhook URL</Label>
          <div className="flex items-center gap-1.5">
            <Input
              readOnly
              value={`${baseUrl}/api/webhooks/${webhookPath}`}
              className="h-7 flex-1 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 shrink-0 text-[10px]"
              onClick={() => navigator.clipboard.writeText(`${baseUrl}/api/webhooks/${webhookPath}`)}
            >
              Copy
            </Button>
          </div>
          <p className="text-[10px] text-zinc-400">Accepts POST requests with JSON body.</p>
        </div>
      ) : (
        <div className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2">
          <p className="text-[11px] text-amber-700">
            Webhook URL will be generated when the workflow is published.
          </p>
        </div>
      )}
    </div>
  );
}
