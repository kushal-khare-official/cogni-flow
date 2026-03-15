"use client";

import { useEffect, useState, type ReactNode } from "react";
import { SlidersHorizontal, Trash2, Plus, X, Send, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useIntegrationStore } from "@/lib/store/integration-store";
import { getNodeIcon } from "@/lib/node-icons";
import {
  NODE_TYPE_LABELS,
  getNodeCategory,
  type BpmnNodeData,
  BpmnNodeType,
} from "@/lib/workflow/types";
import {
  findLoopBackEdge,
  collectLoopBody,
  findLastStepInLoop,
} from "@/lib/workflow/loop-utils";
import { ExecutionContext } from "@/lib/execution/context";
import { resolveExpression, resolveTemplate } from "@/lib/execution/expression";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const IO_TYPES = ["string", "number", "boolean", "object", "array"] as const;

export function NodeInspector() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const integrations = useIntegrationStore((s) => s.integrations);
  const fetchIntegrations = useIntegrationStore((s) => s.fetchIntegrations);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: number;
    statusText: string;
    body: string;
    error?: string;
  } | null>(null);
  const [testToken, setTestToken] = useState("");
  const [testInputJson, setTestInputJson] = useState("");

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
  const canUseIntegration = data.bpmnType === BpmnNodeType.ServiceTask;

  const selectedIntegration = data.integrationId
    ? integrations.find((t) => t.id === data.integrationId)
    : undefined;

  const operationId = data.operationId as string | undefined;
  const resolvedOperation =
    selectedIntegration && operationId
      ? (() => {
          try {
            const ops = JSON.parse(selectedIntegration.operations ?? "[]") as Array<{
              id: string;
              name?: string;
              method?: string;
              path?: string;
              bodyTemplate?: unknown;
              inputSchema?: unknown[];
            }>;
            return ops.find((o) => o.id === operationId) ?? null;
          } catch {
            return null;
          }
        })()
      : null;

  const integrationType = selectedIntegration?.type;
  const stepConfig = (data.stepConfig ?? {}) as Record<string, unknown>;
  const integrationBaseConfig = selectedIntegration
    ? (() => { try { return JSON.parse(selectedIntegration.baseConfig || "{}") as Record<string, unknown>; } catch { return {}; } })()
    : {};

  const outgoingEdges = edges.filter((e) => e.source === node.id);

  const isIntermediateNode =
    data.bpmnType !== BpmnNodeType.StartEvent &&
    data.bpmnType !== BpmnNodeType.EndEvent &&
    data.bpmnType !== BpmnNodeType.WebhookTrigger;

  function update(patch: Partial<BpmnNodeData>) {
    if (selectedNodeId) updateNodeData(selectedNodeId, patch);
  }

  function handleDelete() {
    if (!selectedNodeId) return;
    deleteNode(selectedNodeId);
    selectNode(null);
  }

  async function sendIntegrationTestRequest() {
    if (!selectedIntegration || selectedIntegration.type !== "http") return;
    const base = JSON.parse(selectedIntegration.baseConfig || "{}") as Record<string, unknown>;
    const baseUrl = (base.baseUrl as string)?.trim();
    if (!baseUrl) {
      setTestResult({ status: 0, statusText: "", body: "", error: "Integration has no Base URL." });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      let node1Data: Record<string, unknown> = {};
      if (testInputJson.trim()) {
        try {
          const parsed = JSON.parse(testInputJson.trim());
          if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
            node1Data = parsed;
          }
        } catch (parseErr) {
          setTestResult({ status: 0, statusText: "", body: "", error: `Invalid test input JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` });
          setTestLoading(false);
          return;
        }
      }
      const ctx = new ExecutionContext();
      ctx.set("node-1", node1Data);

      const inputMapping = (data.inputMapping ?? {}) as Record<string, string>;
      const resolvedInputs: Record<string, unknown> = {};
      for (const [key, expr] of Object.entries(inputMapping)) {
        resolvedInputs[key] = resolveExpression(expr, ctx);
      }
      ctx.set("_inputs", resolvedInputs);

      const pathTemplate = (stepConfig.path as string)?.trim() ?? (base.defaultPath as string)?.trim() ?? "";
      const resolvedPath = pathTemplate ? String(resolveExpression(pathTemplate, ctx)) : "";
      const baseUrlNorm = baseUrl.replace(/\/$/, "");
      const url = resolvedPath
        ? `${baseUrlNorm}${resolvedPath.startsWith("/") ? resolvedPath : `/${resolvedPath}`}`
        : baseUrlNorm;

      const method = ((stepConfig.method as string) ?? (base.defaultMethod as string) ?? "GET").toUpperCase();

      const headers: Record<string, string> = {};
      const defaultHeaders = base.defaultHeaders as Record<string, string> | undefined;
      if (defaultHeaders && typeof defaultHeaders === "object") Object.assign(headers, defaultHeaders);
      if ((base.authType as string) === "bearer" && testToken.trim()) {
        headers["Authorization"] = `Bearer ${testToken.trim()}`;
      }

      let body: string | undefined;
      const bodyTemplate = stepConfig.bodyTemplate ?? resolvedOperation?.bodyTemplate ?? base.defaultRequestBody;
      if (method !== "GET" && method !== "HEAD" && bodyTemplate !== undefined && bodyTemplate !== null) {
        let template = bodyTemplate;
        if (typeof template === "string" && template.trim()) {
          try {
            template = JSON.parse(template) as Record<string, unknown>;
          } catch {
            // use as string, resolveTemplate will substitute {{...}} in it
          }
        }
        const resolvedBody = resolveTemplate(template, ctx);
        if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
        if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
          if (typeof resolvedBody === "object" && resolvedBody !== null) {
            const params = new URLSearchParams();
            for (const [k, v] of Object.entries(resolvedBody as Record<string, unknown>)) {
              if (v !== undefined && v !== null && v !== "") params.append(k, String(v));
            }
            body = params.toString();
          } else {
            body = String(resolvedBody ?? "");
          }
        } else {
          body = typeof resolvedBody === "string" ? resolvedBody : JSON.stringify(resolvedBody);
        }
      }

      const res = await fetch(url, { method, headers, body });
      const text = await res.text();
      let parsed: string;
      try {
        parsed = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        parsed = text;
      }
      setTestResult({ status: res.status, statusText: res.statusText, body: parsed });
    } catch (err) {
      setTestResult({
        status: 0,
        statusText: "",
        body: "",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestLoading(false);
    }
  }

  async function sendCodeTestRequest() {
    const code = (stepConfig.code as string)?.trim();
    if (!code) {
      setTestResult({ status: 0, statusText: "", body: "", error: "No code to test. Enter code above." });
      return;
    }
    setTestLoading(true);
    setTestResult(null);
    try {
      let node1Data: Record<string, unknown> = {};
      if (testInputJson.trim()) {
        try {
          const parsed = JSON.parse(testInputJson.trim());
          if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
            node1Data = parsed;
          }
        } catch (parseErr) {
          setTestResult({ status: 0, statusText: "", body: "", error: `Invalid test input JSON: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}` });
          setTestLoading(false);
          return;
        }
      }

      const execCtx = new ExecutionContext();
      execCtx.set("node-1", node1Data);

      const inputMapping = (data.inputMapping ?? {}) as Record<string, string>;
      const resolvedInputs: Record<string, unknown> = {};
      for (const [key, expr] of Object.entries(inputMapping)) {
        resolvedInputs[key] = resolveExpression(expr, execCtx);
      }
      execCtx.set("_inputs", resolvedInputs);

      const language = (stepConfig.language as string) ?? "javascript";
      const res = await fetch("/api/integrations/test-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language, ctx: execCtx.toJSON() }),
      });
      const resData = await res.json();
      const pretty = JSON.stringify(resData, null, 2);
      if (resData.error) {
        setTestResult({ status: res.status, statusText: "", body: "", error: resData.error + (resData.stderr ? `\n${resData.stderr}` : "") });
      } else {
        setTestResult({ status: res.status, statusText: "OK", body: pretty });
      }
    } catch (err) {
      setTestResult({
        status: 0,
        statusText: "",
        body: "",
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTestLoading(false);
    }
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

      {/* Step name — used for mapping UX; empty = use label */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Step name</Label>
        <Input
          value={data.stepName ?? ""}
          onChange={(e) => update({ stepName: e.target.value || undefined })}
          placeholder={data.label || "Same as label"}
          className="text-sm"
        />
        <p className="text-[10px] text-zinc-400">
          Human-readable name for this step when mapping inputs from upstream. Leave empty to use the label.
        </p>
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

      <Separator />
      {/* Output schema — fields this step produces for downstream mapping */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-zinc-600">Output schema</Label>
        <p className="text-[10px] text-zinc-400">
          Declare the output fields this step produces so downstream nodes can map from them (e.g. {`{{${node.id}.fieldName}}`}).
        </p>
        {(data.outputSchema ?? []).map((field, idx) => (
          <div key={idx} className="flex items-start gap-1.5">
            <Input
              value={field.key}
              onChange={(e) => {
                const current = [...(data.outputSchema ?? [])];
                current[idx] = { ...current[idx], key: e.target.value };
                update({ outputSchema: current });
              }}
              placeholder="field name"
              className="h-7 flex-1 text-xs"
            />
            <Input
              value={field.type ?? ""}
              onChange={(e) => {
                const current = [...(data.outputSchema ?? [])];
                current[idx] = { ...current[idx], type: e.target.value || undefined };
                update({ outputSchema: current });
              }}
              placeholder="type"
              className="h-7 w-20 shrink-0 text-[10px]"
            />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const current = [...(data.outputSchema ?? [])];
                current.splice(idx, 1);
                update({ outputSchema: current.length ? current : undefined });
              }}
              className="shrink-0 text-zinc-400 hover:text-red-500"
            >
              <X className="size-3" />
            </Button>
          </div>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const current = data.outputSchema ?? [];
            update({ outputSchema: [...current, { key: "" }] });
          }}
          className="gap-1 text-[10px]"
        >
          <Plus className="size-3" /> Add output field
        </Button>
      </div>

      {(data.bpmnType as BpmnNodeType) === BpmnNodeType.StartEvent ? (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">REST API Trigger</Label>
            <p className="text-[10px] text-zinc-400">
              Define the request body fields that the REST API expects when triggering this workflow.
            </p>

            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Request Body Schema</Label>
              {((data.requestBody ?? []) as { key: string; type: string; required?: boolean; description?: string }[]).map((field, idx) => (
                <div key={idx} className="flex items-start gap-1.5">
                  <Input
                    value={field.key}
                    onChange={(e) => {
                      const current = [...(data.requestBody ?? [])];
                      current[idx] = { ...current[idx], key: e.target.value };
                      update({ requestBody: current });
                    }}
                    placeholder="field name"
                    className="h-7 flex-1 text-xs"
                  />
                  <Select
                    value={field.type}
                    onValueChange={(v) => {
                      const current = [...(data.requestBody ?? [])];
                      current[idx] = { ...current[idx], type: v ?? "string" };
                      update({ requestBody: current });
                    }}
                  >
                    <SelectTrigger className="h-7 w-24 shrink-0 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IO_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1 text-[10px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => {
                        const current = [...(data.requestBody ?? [])];
                        current[idx] = { ...current[idx], required: e.target.checked };
                        update({ requestBody: current });
                      }}
                      className="size-3"
                    />
                    Req
                  </label>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const current = [...(data.requestBody ?? [])];
                      current.splice(idx, 1);
                      update({ requestBody: current });
                    }}
                    className="shrink-0 text-zinc-400 hover:text-red-500"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const current = (data.requestBody ?? []) as { key: string; type: string; required?: boolean; description?: string }[];
                  update({ requestBody: [...current, { key: "", type: "string", required: false, description: "" }] });
                }}
                className="gap-1 text-[10px]"
              >
                <Plus className="size-3" /> Add Field
              </Button>
            </div>

            {node.id && (
              <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-500">
                <p className="font-medium text-zinc-600">Trigger endpoint:</p>
                <p className="mt-0.5 font-mono text-[10px]">POST /api/workflows/&#123;id&#125;/trigger</p>
                <p className="mt-1 text-[10px] text-zinc-400">
                  Publish the workflow and use the trigger endpoint to start it via REST API.
                  Returns 200 immediately; results are delivered to the webhook URL configured on the End node.
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* End Event — Response configuration */}
      {(data.bpmnType as BpmnNodeType) === BpmnNodeType.EndEvent ? (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Response Mode</Label>
            <p className="text-[10px] text-zinc-400">
              Choose how the workflow returns its result when triggered via REST API or webhook.
            </p>
            <Select
              value={(data.responseMode as string) ?? "sync"}
              onValueChange={(v) => update({ responseMode: v as "webhook" | "sync" })}
            >
              <SelectTrigger className="text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="sync">Sync — Return response in HTTP reply</SelectItem>
                  <SelectItem value="webhook">Async — Deliver to webhook URL</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {(data.responseMode as string) === "webhook" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-500">Webhook URL</Label>
                <Input
                  value={(data.webhookUrl as string) ?? ""}
                  onChange={(e) => update({ webhookUrl: e.target.value })}
                  placeholder="https://example.com/webhook/callback"
                  className="text-xs font-mono"
                />
              </div>
            )}

            <Separator />
            <Label className="text-xs font-semibold text-zinc-600">Response Mapping</Label>
            <p className="text-[10px] text-zinc-400">
              Map specific values from the workflow context into the response output. Leave empty to return the full end-node input.
            </p>
            {Object.entries((data.responseMapping as Record<string, string>) ?? {}).map(([key, expr], idx) => (
              <div key={idx} className="flex items-center gap-1.5">
                <Input
                  value={key}
                  onChange={(e) => {
                    const mapping = { ...((data.responseMapping as Record<string, string>) ?? {}) };
                    const entries = Object.entries(mapping);
                    entries[idx] = [e.target.value, expr];
                    update({ responseMapping: Object.fromEntries(entries) });
                  }}
                  placeholder="key"
                  className="flex-1 text-xs font-mono"
                />
                <span className="text-zinc-300">←</span>
                <Input
                  value={expr}
                  onChange={(e) => {
                    const mapping = { ...((data.responseMapping as Record<string, string>) ?? {}) };
                    mapping[key] = e.target.value;
                    update({ responseMapping: mapping });
                  }}
                  placeholder="{{node-id.field}}"
                  className="flex-1 text-xs font-mono"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => {
                    const mapping = { ...((data.responseMapping as Record<string, string>) ?? {}) };
                    delete mapping[key];
                    update({ responseMapping: mapping });
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                const mapping = { ...((data.responseMapping as Record<string, string>) ?? {}) };
                mapping[""] = "";
                update({ responseMapping: mapping });
              }}
            >
              <Plus className="mr-1 h-3 w-3" /> Add Mapping
            </Button>

            <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-500">
              <p className="font-medium text-zinc-600">Response payload:</p>
              <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-zinc-400">{`{
  "runId": "...",
  "workflowId": "...",
  "status": "completed" | "failed",
  "output": { ... },
  "error": null | "...",
  "completedAt": "..."
}`}</pre>
            </div>
          </div>
        </>
      ) : null}

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

      {/* Integration config — Service Task only */}
      {canUseIntegration && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Integration</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Integration</Label>
              <Select
                value={data.integrationId ?? ""}
                onValueChange={(val) =>
                  update({
                    integrationId: val ?? undefined,
                    stepConfig: val ? { ...stepConfig } : undefined,
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
                  {(() => {
                    const grouped = new Map<string, typeof integrations>();
                    for (const t of integrations) {
                      const cat = t.category || "custom";
                      if (!grouped.has(cat)) grouped.set(cat, []);
                      grouped.get(cat)!.push(t);
                    }
                    return Array.from(grouped.entries()).map(([cat, tpls]) => (
                      <SelectGroup key={cat}>
                        <SelectLabel className="text-[10px] uppercase tracking-wider text-zinc-400">
                          {cat}
                        </SelectLabel>
                        {tpls.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            <span className="flex items-center gap-1.5">
                              {t.name}
                              <Badge variant="outline" className="ml-1 text-[9px] font-normal">
                                {t.type}
                              </Badge>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {selectedIntegration && (
              <>
                <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-500">
                  <span className="font-medium text-zinc-600">{selectedIntegration.name}</span>
                  <span className="mx-1">·</span>
                  <Badge variant="outline" className="text-[9px]">{selectedIntegration.type}</Badge>
                  {resolvedOperation?.name && (
                    <>
                      <span className="mx-1">·</span>
                      <span className="font-medium">{resolvedOperation.name}</span>
                    </>
                  )}
                  {integrationType === "http" && (stepConfig.method || stepConfig.path || resolvedOperation?.method || resolvedOperation?.path) ? (
                    <>
                      <span className="mx-1">·</span>
                      <span className="font-mono">{(stepConfig.method as string) ?? resolvedOperation?.method ?? "GET"} {(stepConfig.path as string) ?? resolvedOperation?.path ?? "/"}</span>
                    </>
                  ) : null}
                  {integrationType === "code" && (
                    <>
                      <span className="mx-1">·</span>
                      <span>{(stepConfig.language as string) ?? (() => { try { return (JSON.parse(selectedIntegration.baseConfig) as Record<string, unknown>)?.language ?? "javascript"; } catch { return "javascript"; } })() as string}</span>
                    </>
                  )}
                  <p className="mt-0.5 text-[10px] text-zinc-400">
                    Edit integration via the Integrations button in the top bar. Step config below.
                  </p>
                </div>

                {integrationType === "webhook" && (
                  <WebhookProperties data={data} />
                )}

                {/* Step config: HTTP */}
                {integrationType === "http" && (
                  <>
                    <Separator />
                    <Label className="text-xs font-semibold text-zinc-600">Step config</Label>
                    {resolvedOperation && (
                      <p className="text-[10px] text-zinc-400 mb-1.5">
                        Operation: <span className="font-medium text-zinc-600">{resolvedOperation.name}</span>
                        {!stepConfig.method && !stepConfig.path && " (method/path from integration)"}
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Method</Label>
                        <Select
                          value={(stepConfig.method as string) ?? resolvedOperation?.method ?? "GET"}
                          onValueChange={(v) => update({ stepConfig: { ...stepConfig, method: v } })}
                        >
                          <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"].map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Path</Label>
                        <Input
                          value={(stepConfig.path as string) ?? resolvedOperation?.path ?? ""}
                          onChange={(e) => update({ stepConfig: { ...stepConfig, path: e.target.value } })}
                          placeholder="/resource/{{id}}"
                          className="font-mono text-xs"
                        />
                      </div>
                    </div>
                    {(() => {
                      const dh = integrationBaseConfig.defaultHeaders as Record<string, string> | undefined;
                      const isForm = dh?.["Content-Type"] === "application/x-www-form-urlencoded";
                      return (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-500">
                            Body template{" "}
                            <span className="font-normal text-zinc-400">
                              ({isForm ? "key-value pairs — sent as form data" : "JSON"})
                            </span>
                          </Label>
                          <Textarea
                            value={typeof stepConfig.bodyTemplate === "string" ? stepConfig.bodyTemplate : (stepConfig.bodyTemplate ? JSON.stringify(stepConfig.bodyTemplate, null, 2) : (resolvedOperation?.bodyTemplate ? JSON.stringify(resolvedOperation.bodyTemplate, null, 2) : ""))}
                            onChange={(e) => {
                              const raw = e.target.value.trim();
                              let bodyTemplate: unknown = undefined;
                              if (raw) {
                                try { bodyTemplate = JSON.parse(raw); } catch { bodyTemplate = raw; }
                              }
                              update({ stepConfig: { ...stepConfig, bodyTemplate } });
                            }}
                            placeholder={isForm ? '{"amount": "{{amount}}", "currency": "{{currency}}"}' : '{"key": "{{value}}"}'}
                            rows={3}
                            className="resize-none font-mono text-xs"
                          />
                          {isForm && (
                            <p className="text-[10px] text-zinc-400">
                              Key-value pairs will be encoded as <code className="rounded bg-zinc-100 px-0.5 text-[9px]">key=value&amp;key2=value2</code> when sent.
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-600">Test integration</Label>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Test input (JSON) — used to resolve {""}
                          <code className="rounded bg-zinc-100 px-0.5 text-[10px]">{"{{node-1.*}}"}</code> and input mapping in path/body
                        </Label>
                        <Textarea
                          value={testInputJson}
                          onChange={(e) => setTestInputJson(e.target.value)}
                          placeholder='{"name": "My Agent", "modelProvider": "openai"}'
                          rows={2}
                          className="resize-none font-mono text-xs"
                        />
                      </div>
                      {(integrationBaseConfig.authType as string) === "bearer" && (
                        <div className="space-y-1">
                          <Label className="text-[11px] text-zinc-500">Test token (optional, not saved)</Label>
                          <Input
                            type="password"
                            value={testToken}
                            onChange={(e) => setTestToken(e.target.value)}
                            placeholder="Bearer token for test only"
                            className="font-mono text-xs"
                            autoComplete="off"
                          />
                        </div>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={sendIntegrationTestRequest}
                        disabled={testLoading}
                        className="gap-1.5 text-xs"
                      >
                        {testLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        {testLoading ? "Sending…" : "Send test request"}
                      </Button>
                      {testResult && (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                          <div className="mb-1 flex items-center gap-2">
                            {testResult.error ? (
                              <XCircle className="size-3.5 text-red-500" />
                            ) : testResult.status >= 200 && testResult.status < 300 ? (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            ) : (
                              <XCircle className="size-3.5 text-amber-500" />
                            )}
                            <span className="text-[11px] font-medium">
                              {testResult.error ? "Error" : `${testResult.status} ${testResult.statusText}`}
                            </span>
                          </div>
                          {(testResult.error ?? testResult.body) && (
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-zinc-100 p-1.5 font-mono text-[10px] dark:bg-zinc-800">
                              {(testResult.error ?? (testResult.body || "(empty body)"))}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Step config: MCP */}
                {integrationType === "mcp_tool" && (
                  <>
                    <Separator />
                    <Label className="text-xs font-semibold text-zinc-600">Step config</Label>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-500">Tool name</Label>
                      <Input
                        value={(stepConfig.toolName as string) ?? ""}
                        onChange={(e) => update({ stepConfig: { ...stepConfig, toolName: e.target.value } })}
                        placeholder="e.g. search_web"
                        className="font-mono text-xs"
                      />
                    </div>
                  </>
                )}

                {/* Step config: Code */}
                {integrationType === "code" && (
                  <>
                    <Separator />
                    <Label className="text-xs font-semibold text-zinc-600">Step config</Label>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-500">Language</Label>
                      <Select
                        value={(stepConfig.language as string) ?? "javascript"}
                        onValueChange={(v) => update({ stepConfig: { ...stepConfig, language: v } })}
                      >
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="javascript">JavaScript</SelectItem>
                          <SelectItem value="python">Python</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] text-zinc-500">Code</Label>
                      <Textarea
                        value={(stepConfig.code as string) ?? ""}
                        onChange={(e) => update({ stepConfig: { ...stepConfig, code: e.target.value } })}
                        placeholder="return { result: ctx['node-1'].value };"
                        rows={8}
                        className="resize-none font-mono text-xs"
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-zinc-600">Test code</Label>
                      <div className="space-y-1">
                        <Label className="text-[11px] text-zinc-500">Test input (JSON) — used to resolve {""}
                          <code className="rounded bg-zinc-100 px-0.5 text-[10px]">{"{{node-1.*}}"}</code> and input mapping; available as{" "}
                          <code className="rounded bg-zinc-100 px-0.5 text-[10px]">ctx[&apos;node-1&apos;]</code> and{" "}
                          <code className="rounded bg-zinc-100 px-0.5 text-[10px]">ctx._inputs</code>
                        </Label>
                        <Textarea
                          value={testInputJson}
                          onChange={(e) => setTestInputJson(e.target.value)}
                          placeholder='{"name": "My Agent", "modelProvider": "openai"}'
                          rows={2}
                          className="resize-none font-mono text-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={sendCodeTestRequest}
                        disabled={testLoading}
                        className="gap-1.5 text-xs"
                      >
                        {testLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Send className="size-3.5" />
                        )}
                        {testLoading ? "Running…" : "Run test code"}
                      </Button>
                      {testResult && (
                        <div className="rounded-md border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50">
                          <div className="mb-1 flex items-center gap-2">
                            {testResult.error ? (
                              <XCircle className="size-3.5 text-red-500" />
                            ) : (
                              <CheckCircle2 className="size-3.5 text-emerald-500" />
                            )}
                            <span className="text-[11px] font-medium">
                              {testResult.error ? "Error" : "Success"}
                            </span>
                          </div>
                          {(testResult.error ?? testResult.body) && (
                            <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-zinc-100 p-1.5 font-mono text-[10px] dark:bg-zinc-800">
                              {(testResult.error ?? (testResult.body || "(no output)"))}
                            </pre>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

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
        </>
      )}

      {/* Input Mapping — available for all intermediate nodes */}
      {isIntermediateNode && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Input Mapping</Label>
            <p className="text-[10px] text-zinc-400">
              Map data from previous nodes into this node. Use expressions like{" "}
              <code className="rounded bg-zinc-100 px-1 text-[9px]">{"{{node-1.fieldName}}"}</code>{" "}
              to reference outputs from earlier nodes.
            </p>
            {(() => {
              const incomingEdges = edges.filter((e) => e.target === node.id);
              const upstreamNodes = incomingEdges
                .map((e) => nodes.find((n) => n.id === e.source))
                .filter(Boolean) as typeof nodes;
              if (upstreamNodes.length === 0) return null;
              return (
                <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2">
                  <p className="text-[10px] font-medium text-zinc-600 mb-1.5">From upstream steps</p>
                  <div className="flex flex-wrap gap-1">
                    {upstreamNodes.map((up) => {
                      const stepName = (up.data as BpmnNodeData).stepName || up.data.label || up.id;
                      const schema = (up.data as BpmnNodeData).outputSchema ?? [];
                      return (
                        <div key={up.id} className="flex flex-wrap items-center gap-1">
                          <span className="text-[10px] text-zinc-500">{stepName}</span>
                          <span className="text-[9px] text-zinc-400 font-mono">({up.id})</span>
                          {schema.length > 0 ? (
                            schema.map((f) => (
                              <Button
                                key={f.key}
                                variant="outline"
                                size="sm"
                                className="h-5 text-[9px] px-1.5 font-mono"
                                onClick={() => {
                                  const expr = `{{${up.id}.${f.key}}}`;
                                  const current = { ...(data.inputMapping ?? {}), [`${f.key}_from_${up.id}`]: expr };
                                  update({ inputMapping: current });
                                }}
                              >
                                {f.key}
                              </Button>
                            ))
                          ) : (
                            <span className="text-[9px] text-zinc-400 italic">no output schema</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[9px] text-zinc-400 mt-1">Click a field to add a mapping from that upstream output.</p>
                </div>
              );
            })()}
            {Object.entries(data.inputMapping ?? {}).map(([key, value]) => (
              <InputMappingRow
                key={key}
                fieldKey={key}
                fieldValue={value}
                onChange={(newKey, newValue) => {
                  const current = { ...(data.inputMapping ?? {}) };
                  if (newKey !== key) {
                    delete current[key];
                  }
                  current[newKey] = newValue;
                  update({ inputMapping: current });
                }}
                onRemove={() => {
                  const current = { ...(data.inputMapping ?? {}) };
                  delete current[key];
                  update({ inputMapping: current });
                }}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const current = { ...(data.inputMapping ?? {}) };
                const newKey = `field_${Object.keys(current).length + 1}`;
                current[newKey] = "";
                update({ inputMapping: current });
              }}
              className="gap-1 text-[10px]"
            >
              <Plus className="size-3" /> Add Mapping
            </Button>
          </div>
        </>
      )}

      {/* Output Mapping — integration response → step output (integration nodes only) */}
      {(data.integrationId ?? data.integrationTemplateId) && (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Output Mapping</Label>
            <p className="text-[10px] text-zinc-400">
              Map integration response to step output. Key = step output field (e.g. <code className="rounded bg-zinc-100 px-1 text-[9px]">id</code>). Value = dot path into response (e.g. <code className="rounded bg-zinc-100 px-1 text-[9px]">body.id</code>, <code className="rounded bg-zinc-100 px-1 text-[9px]">body</code> for HTTP).
            </p>
            {Object.entries(data.outputMapping ?? {}).map(([key, value]) => (
              <InputMappingRow
                key={key}
                fieldKey={key}
                fieldValue={value}
                onChange={(newKey, newValue) => {
                  const current = { ...(data.outputMapping ?? {}) };
                  if (newKey !== key) delete current[key];
                  current[newKey] = newValue;
                  update({ outputMapping: current });
                }}
                onRemove={() => {
                  const current = { ...(data.outputMapping ?? {}) };
                  delete current[key];
                  update({ outputMapping: Object.keys(current).length ? current : undefined });
                }}
              />
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const current = { ...(data.outputMapping ?? {}) };
                current[`out_${Object.keys(current).length + 1}`] = "";
                update({ outputMapping: current });
              }}
              className="gap-1 text-[10px]"
            >
              <Plus className="size-3" /> Add Output Mapping
            </Button>
          </div>
        </>
      )}

      {/* Loop configuration */}
      {(data.bpmnType as BpmnNodeType) === BpmnNodeType.Loop ? (
        <>
          <Separator />
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-zinc-600">Loop Settings</Label>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">Max Iterations</Label>
              <Input
                type="number"
                min={1}
                max={1000}
                value={(data.config as Record<string, unknown>)?.maxIterations as number ?? 10}
                onChange={(e) =>
                  update({ config: { ...data.config, maxIterations: Number(e.target.value) || 10 } })
                }
                className="text-sm"
              />
              <p className="text-[10px] text-zinc-400">
                Loop terminates after this many iterations.
              </p>
            </div>

            {(() => {
              const backEdge = findLoopBackEdge(node.id, edges);
              const lastStepId = findLastStepInLoop(node.id, edges);
              const bodyIds = collectLoopBody(node.id, nodes, edges);
              const bodyNodes = bodyIds
                .map((id) => nodes.find((n) => n.id === id))
                .filter(Boolean);

              if (!backEdge) {
                return (
                  <div className="rounded-md border border-amber-100 bg-amber-50 px-2.5 py-2">
                    <p className="text-[11px] text-amber-700">
                      No back-edge detected. Connect the last step in your loop body back to
                      this Loop node to enable iteration.
                    </p>
                  </div>
                );
              }

              const lastNode = nodes.find((n) => n.id === lastStepId);
              return (
                <div className="space-y-2">
                  <div className="rounded-md border border-zinc-100 bg-zinc-50 p-2 text-[11px] text-zinc-500">
                    <p>
                      <span className="font-medium text-zinc-600">Body:</span>{" "}
                      {bodyNodes.map((n) => n!.data.label).join(" → ")}
                    </p>
                    <p className="mt-1">
                      <span className="font-medium text-zinc-600">Last step:</span>{" "}
                      {lastNode?.data.label ?? lastStepId}
                    </p>
                  </div>
                </div>
              );
            })()}
          </div>
        </>
      ) : null}

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

function InputMappingRow({
  fieldKey,
  fieldValue,
  onChange,
  onRemove,
}: {
  fieldKey: string;
  fieldValue: string;
  onChange: (key: string, value: string) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-1.5">
      <Input
        value={fieldKey}
        onChange={(e) => onChange(e.target.value, fieldValue)}
        placeholder="key"
        className="h-7 w-28 shrink-0 text-xs"
      />
      <Input
        value={fieldValue}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        placeholder="{{node-1.field}} or literal"
        className="h-7 flex-1 text-xs font-mono"
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
