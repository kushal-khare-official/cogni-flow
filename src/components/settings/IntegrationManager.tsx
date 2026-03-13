"use client";

import { useState, useEffect, useCallback } from "react";
import { Plug, Plus, Trash2, Loader2, Pencil, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIntegrationStore } from "@/lib/store/integration-store";

const INTEGRATION_TYPES = [
  { value: "http", label: "REST API" },
  { value: "webhook", label: "REST API + Webhook Callback" },
  { value: "mcp_tool", label: "MCP Tool Call" },
  { value: "code", label: "Custom Code Script" },
  { value: "kafka", label: "Kafka Topic Consumer" },
] as const;

const CATEGORIES = [
  { value: "api", label: "API" },
  { value: "messaging", label: "Messaging" },
  { value: "ai", label: "AI / MCP" },
  { value: "code", label: "Code" },
  { value: "custom", label: "Custom" },
] as const;

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const;

const CODE_LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
] as const;

interface Template {
  id: string;
  name: string;
  icon: string;
  category: string;
  type: string;
  description: string;
  baseConfig: string;
  operations: string;
  isBuiltIn: boolean;
}

export function IntegrationManager() {
  const [open, setOpen] = useState(false);
  const [integrations, setIntegrations] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  // General fields
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("http");
  const [formCategory, setFormCategory] = useState("custom");
  const [formDescription, setFormDescription] = useState("");

  // HTTP fields
  const [formBaseUrl, setFormBaseUrl] = useState("");
  const [formAuthType, setFormAuthType] = useState("bearer");
  const [formDefaultHeaders, setFormDefaultHeaders] = useState("");
  const [formMethod, setFormMethod] = useState("GET");
  const [formPath, setFormPath] = useState("");
  const [formBodyTemplate, setFormBodyTemplate] = useState("");

  // MCP fields
  const [formMcpCommand, setFormMcpCommand] = useState("");

  // Code fields
  const [formCodeLanguage, setFormCodeLanguage] = useState("javascript");
  const [formCode, setFormCode] = useState("");

  // Kafka fields
  const [formKafkaBrokers, setFormKafkaBrokers] = useState("localhost:9092");
  const [formKafkaTopic, setFormKafkaTopic] = useState("");
  const [formKafkaGroupId, setFormKafkaGroupId] = useState("");

  // Raw operations JSON (fallback for advanced users)
  const [formOperationsJson, setFormOperationsJson] = useState("[]");
  const [showRawOps, setShowRawOps] = useState(false);

  const invalidateAndRefetch = useIntegrationStore((s) => s.invalidateAndRefetch);

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations");
      const data = await res.json();
      setIntegrations(data.integrations ?? []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchIntegrations();
  }, [open, fetchIntegrations]);

  function resetForm() {
    setFormName("");
    setFormType("http");
    setFormCategory("custom");
    setFormDescription("");
    setFormBaseUrl("");
    setFormAuthType("bearer");
    setFormDefaultHeaders("");
    setFormMethod("GET");
    setFormPath("");
    setFormBodyTemplate("");
    setFormMcpCommand("");
    setFormCodeLanguage("javascript");
    setFormCode("");
    setFormKafkaBrokers("localhost:9092");
    setFormKafkaTopic("");
    setFormKafkaGroupId("");
    setFormOperationsJson("[]");
    setShowRawOps(false);
    setEditingId(null);
  }

  function startEdit(tpl: Template) {
    const base = JSON.parse(tpl.baseConfig || "{}");
    const ops = JSON.parse(tpl.operations || "[]") as Record<string, unknown>[];

    setFormName(tpl.name);
    setFormType(tpl.type);
    setFormCategory(tpl.category);
    setFormDescription(tpl.description);

    if (tpl.type === "http") {
      setFormBaseUrl(base.baseUrl ?? "");
      setFormAuthType(base.authType ?? "bearer");
      setFormDefaultHeaders(
        base.defaultHeaders ? JSON.stringify(base.defaultHeaders, null, 2) : "",
      );
      const firstOp = ops[0] as Record<string, unknown> | undefined;
      setFormMethod((firstOp?.method as string) ?? "GET");
      setFormPath((firstOp?.path as string) ?? "");
      setFormBodyTemplate(
        firstOp?.bodyTemplate ? JSON.stringify(firstOp.bodyTemplate, null, 2) : "",
      );
    } else if (tpl.type === "mcp_tool") {
      setFormMcpCommand(base.command ?? "");
    } else if (tpl.type === "kafka") {
      setFormKafkaBrokers(base.brokers ?? "localhost:9092");
      setFormKafkaTopic(base.topic ?? "");
      setFormKafkaGroupId(base.groupId ?? "");
    } else if (tpl.type === "code") {
      setFormCodeLanguage(base.language ?? "javascript");
      const firstOp = ops[0] as Record<string, unknown> | undefined;
      setFormCode((firstOp?.codeTemplate as string) ?? "");
    }

    setFormOperationsJson(JSON.stringify(ops, null, 2));
    setEditingId(tpl.id);
    setView("form");
  }

  function startCreate() {
    resetForm();
    setView("form");
  }

  async function handleSave() {
    if (!formName.trim()) return;

    const baseConfig: Record<string, unknown> = {};
    let operations: unknown[] = [];

    if (formType === "http") {
      baseConfig.baseUrl = formBaseUrl;
      baseConfig.authType = formAuthType;
      if (formDefaultHeaders.trim()) {
        try { baseConfig.defaultHeaders = JSON.parse(formDefaultHeaders); } catch { /* ignore */ }
      }
      if (showRawOps) {
        try { operations = JSON.parse(formOperationsJson); } catch { /* keep empty */ }
      } else {
        let body: unknown = undefined;
        if (formBodyTemplate.trim()) {
          try { body = JSON.parse(formBodyTemplate); } catch { body = formBodyTemplate; }
        }
        operations = [{
          id: "default",
          name: formName,
          method: formMethod,
          path: formPath,
          ...(body !== undefined ? { bodyTemplate: body } : {}),
        }];
      }
    } else if (formType === "mcp_tool") {
      baseConfig.command = formMcpCommand;
      if (showRawOps) {
        try { operations = JSON.parse(formOperationsJson); } catch { /* keep empty */ }
      }
    } else if (formType === "kafka") {
      baseConfig.brokers = formKafkaBrokers;
      baseConfig.topic = formKafkaTopic;
      baseConfig.groupId = formKafkaGroupId;
      operations = [{
        id: "consume",
        name: "Consume Messages",
        inputSchema: [
          { key: "topic", label: "Topic", type: "string", required: true },
          { key: "groupId", label: "Consumer Group ID", type: "string", required: true },
          { key: "brokers", label: "Brokers", type: "string", required: true },
        ],
      }];
    } else if (formType === "code") {
      baseConfig.language = formCodeLanguage;
      operations = [{
        id: "default",
        name: formName,
        codeTemplate: formCode,
        language: formCodeLanguage,
      }];
    } else if (formType === "webhook") {
      // no extra config needed
    }

    if (showRawOps && formType !== "http" && formType !== "code") {
      try { operations = JSON.parse(formOperationsJson); } catch { /* keep empty */ }
    }

    const payload = {
      name: formName,
      type: formType,
      category: formCategory,
      description: formDescription,
      baseConfig,
      operations,
    };

    if (editingId) {
      await fetch(`/api/integrations/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    setView("list");
    fetchIntegrations();
    invalidateAndRefetch();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/integration-templates/${id}`, { method: "DELETE" });
    fetchIntegrations();
    invalidateAndRefetch();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Plug className="size-3.5" />
            Integrations
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plug className="size-4" />
            Integrations
          </DialogTitle>
        </DialogHeader>

        {/* LIST VIEW */}
        {view === "list" && (
          <>
            <ScrollArea className="max-h-[28rem]">
              <div className="space-y-2 py-1">
                {loading && (
                  <div className="flex justify-center py-6">
                    <Loader2 className="size-5 animate-spin text-zinc-400" />
                  </div>
                )}
                {!loading && integrations.length === 0 && (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    No integrations yet.
                  </p>
                )}
                {(() => {
                  const grouped = new Map<string, Template[]>();
                  for (const tpl of integrations) {
                    const cat = tpl.category || "custom";
                    if (!grouped.has(cat)) grouped.set(cat, []);
                    grouped.get(cat)!.push(tpl);
                  }
                  const categoryLabel = (cat: string) =>
                    CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

                  return Array.from(grouped.entries()).map(([cat, templates]) => (
                    <div key={cat} className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pt-1">
                        {categoryLabel(cat)}
                      </p>
                      {templates.map((tpl) => (
                        <div
                          key={tpl.id}
                          className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-medium">{tpl.name}</p>
                              {tpl.isBuiltIn && (
                                <Badge variant="secondary" className="text-[9px] shrink-0">
                                  Built-in
                                </Badge>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <Badge variant="outline" className="text-[9px]">{tpl.type}</Badge>
                            </div>
                            {tpl.description && (
                              <p className="mt-1 truncate text-[11px] text-zinc-400">{tpl.description}</p>
                            )}
                          </div>
                          <div className="ml-2 flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon-sm" onClick={() => startEdit(tpl)} className="text-zinc-400 hover:text-zinc-600">
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(tpl.id)} className="text-zinc-400 hover:text-red-500">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ));
                })()}
              </div>
            </ScrollArea>
            <Button onClick={startCreate} className="mt-2 gap-1.5 text-xs" variant="outline">
              <Plus className="size-3.5" /> New Integration
            </Button>
          </>
        )}

        {/* FORM VIEW */}
        {view === "form" && (
          <ScrollArea className="max-h-[32rem]">
            <div className="space-y-3 py-1 pr-2">
              {/* Back button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { resetForm(); setView("list"); }}
                className="gap-1 text-xs text-zinc-500"
              >
                <ArrowLeft className="size-3" /> Back to list
              </Button>

              {/* General */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Stripe API" className="text-sm" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Type</Label>
                  <Select value={formType} onValueChange={(v) => setFormType(v ?? "http")}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {INTEGRATION_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select value={formCategory} onValueChange={(v) => setFormCategory(v ?? "custom")}>
                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Description</Label>
                  <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="What this integration does" className="text-sm" />
                </div>
              </div>

              <Separator />

              {/* ─── HTTP CONFIG ─── */}
              {formType === "http" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">HTTP Configuration</p>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Base URL</Label>
                      <Input value={formBaseUrl} onChange={(e) => setFormBaseUrl(e.target.value)} placeholder="https://api.example.com/v1" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Auth Type</Label>
                      <Select value={formAuthType} onValueChange={(v) => setFormAuthType(v ?? "bearer")}>
                        <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bearer">Bearer Token</SelectItem>
                          <SelectItem value="basic">Basic Auth</SelectItem>
                          <SelectItem value="apiKey">API Key Header</SelectItem>
                          <SelectItem value="none">No Auth</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Default Headers <span className="font-normal text-zinc-400">(JSON)</span></Label>
                    <Textarea value={formDefaultHeaders} onChange={(e) => setFormDefaultHeaders(e.target.value)} placeholder='{"Content-Type": "application/json"}' rows={2} className="resize-none font-mono text-xs" />
                  </div>

                  {!showRawOps && (
                    <>
                      <Separator className="my-1" />
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Default Endpoint</p>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Method</Label>
                          <Select value={formMethod} onValueChange={(v) => setFormMethod(v ?? "GET")}>
                            <SelectTrigger className="text-xs font-mono"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {HTTP_METHODS.map((m) => (
                                <SelectItem key={m} value={m}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Path <span className="font-normal text-zinc-400">(appended to base URL)</span></Label>
                          <Input value={formPath} onChange={(e) => setFormPath(e.target.value)} placeholder="/resource/{{id}}" className="font-mono text-sm" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Request Body Template <span className="font-normal text-zinc-400">(JSON)</span></Label>
                        <Textarea value={formBodyTemplate} onChange={(e) => setFormBodyTemplate(e.target.value)} placeholder='{"amount": "{{amount}}", "currency": "{{currency}}"}' rows={4} className="resize-none font-mono text-xs" />
                      </div>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowRawOps(!showRawOps)}
                    className="text-[10px] text-blue-600 hover:underline"
                  >
                    {showRawOps ? "Use visual editor" : "Edit raw operations JSON"}
                  </button>

                  {showRawOps && (
                    <div className="space-y-1.5">
                      <Label className="text-xs">Operations <span className="font-normal text-zinc-400">(JSON array)</span></Label>
                      <Textarea value={formOperationsJson} onChange={(e) => setFormOperationsJson(e.target.value)} rows={8} className="resize-none font-mono text-xs" placeholder='[{"id":"op1","name":"List items","method":"GET","path":"/items"}]' />
                    </div>
                  )}
                </div>
              )}

              {/* ─── WEBHOOK INFO ─── */}
              {formType === "webhook" && (
                <div className="rounded-md border border-blue-100 bg-blue-50 p-2.5">
                  <p className="text-xs text-blue-700">
                    Webhook URL is auto-generated when the workflow is published.
                    The endpoint accepts POST requests with a JSON body.
                  </p>
                </div>
              )}

              {/* ─── MCP CONFIG ─── */}
              {formType === "mcp_tool" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">MCP Tool Configuration</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Command</Label>
                    <Input value={formMcpCommand} onChange={(e) => setFormMcpCommand(e.target.value)} placeholder="npx -y @example/mcp-server" className="font-mono text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Operations <span className="font-normal text-zinc-400">(JSON array)</span></Label>
                    <Textarea value={formOperationsJson} onChange={(e) => setFormOperationsJson(e.target.value)} rows={5} className="resize-none font-mono text-xs" placeholder='[{"id":"tool1","name":"Search","toolName":"search_web"}]' />
                  </div>
                </div>
              )}

              {/* ─── KAFKA CONFIG ─── */}
              {formType === "kafka" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Kafka Configuration</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Brokers <span className="font-normal text-zinc-400">(comma-separated)</span></Label>
                    <Input value={formKafkaBrokers} onChange={(e) => setFormKafkaBrokers(e.target.value)} placeholder="localhost:9092" className="font-mono text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Topic</Label>
                      <Input value={formKafkaTopic} onChange={(e) => setFormKafkaTopic(e.target.value)} placeholder="my-topic" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Consumer Group ID</Label>
                      <Input value={formKafkaGroupId} onChange={(e) => setFormKafkaGroupId(e.target.value)} placeholder="my-consumer-group" className="font-mono text-sm" />
                    </div>
                  </div>
                </div>
              )}

              {/* ─── CODE CONFIG ─── */}
              {formType === "code" && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Custom Code</p>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Language</Label>
                    <Select value={formCodeLanguage} onValueChange={(v) => setFormCodeLanguage(v ?? "javascript")}>
                      <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CODE_LANGUAGES.map((l) => (
                          <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Code
                      {formCodeLanguage === "javascript" && (
                        <span className="ml-1 font-normal text-zinc-400">
                          receives ctx object, return result
                        </span>
                      )}
                      {formCodeLanguage === "python" && (
                        <span className="ml-1 font-normal text-zinc-400">
                          receives ctx dict via stdin JSON, print result JSON to stdout
                        </span>
                      )}
                    </Label>
                    <Textarea
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      rows={12}
                      className="resize-none font-mono text-xs"
                      placeholder={
                        formCodeLanguage === "javascript"
                          ? '// Access upstream outputs via ctx\nconst value = ctx["node-1"].amount;\nreturn { total: value * 1.1 };'
                          : 'import json, sys\nctx = json.load(sys.stdin)\nresult = {"total": ctx["node-1"]["amount"] * 1.1}\nprint(json.dumps(result))'
                      }
                    />
                  </div>
                </div>
              )}

              <Separator />

              <div className="flex gap-2">
                <Button size="sm" onClick={handleSave} className="bg-emerald-600 text-xs hover:bg-emerald-700">
                  {editingId ? "Update" : "Create"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => { resetForm(); setView("list"); }} className="text-xs">
                  Cancel
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
