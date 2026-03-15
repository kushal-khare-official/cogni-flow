"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useExecutionStore } from "@/lib/store/execution-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";

type PanelTab = "runs" | "kya";

interface AuditEntry {
  id: string;
  action: string;
  amountCents: number | null;
  status: string;
  anomalyScore: number | null;
  createdAt: string;
}

function applyTraceToCanvas(
  trace: { nodeId: string; input?: unknown; output?: unknown }[]
) {
  const nodes = useWorkflowStore.getState().nodes;
  const traceByNodeId = new Map<
    string,
    { input?: unknown; output?: unknown; count: number }
  >();
  for (const step of trace) {
    const existing = traceByNodeId.get(step.nodeId);
    if (existing) {
      existing.count += 1;
      existing.input = step.input;
      existing.output = step.output;
    } else {
      traceByNodeId.set(step.nodeId, {
        input: step.input,
        output: step.output,
        count: 1,
      });
    }
  }
  useWorkflowStore.setState({
    nodes: nodes.map((n) => {
      const entry = traceByNodeId.get(n.id);
      if (entry) {
        return {
          ...n,
          data: {
            ...n.data,
            executionStatus: "completed" as const,
            executionInput: entry.input,
            executionOutput: entry.output,
            executionCount: entry.count > 1 ? entry.count : undefined,
          },
        };
      }
      return {
        ...n,
        data: {
          ...n.data,
          executionStatus: "idle" as const,
          executionInput: undefined,
          executionOutput: undefined,
          executionCount: undefined,
        },
      };
    }),
  });
}

function clearCanvasTrace() {
  const nodes = useWorkflowStore.getState().nodes;
  const needsReset = nodes.some(
    (n) =>
      (n.data.executionStatus && n.data.executionStatus !== "idle") ||
      n.data.executionInput !== undefined ||
      n.data.executionOutput !== undefined ||
      n.data.executionCount !== undefined
  );
  if (!needsReset) return;
  useWorkflowStore.setState({
    nodes: nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        executionStatus: "idle" as const,
        executionInput: undefined,
        executionOutput: undefined,
        executionCount: undefined,
      },
    })),
  });
}

export function ExecutionPanel() {
  const open = useExecutionStore((s) => s.executionPanelOpen);
  const setOpen = useExecutionStore((s) => s.setExecutionPanelOpen);
  const history = useExecutionStore((s) => s.history);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const setHistory = useExecutionStore((s) => s.setHistory);
  const workflowId = useWorkflowStore((s) => s.id);
  const selectedRunId = useExecutionStore((s) => s.selectedRunId);
  const setSelectedRunId = useExecutionStore((s) => s.setSelectedRunId);

  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<PanelTab>("runs");
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    if (!open || !workflowId) return;
    fetch(`/api/executions?workflowId=${workflowId}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (data.runs) setHistory(data.runs);
      })
      .catch(() => {});
  }, [open, workflowId, setHistory]);

  useEffect(() => {
    if (!open || tab !== "kya") return;
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setAgents(list.map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })));
        if (list.length > 0 && !selectedAgentId) setSelectedAgentId(list[0].id);
      })
      .catch(() => setAgents([]));
  }, [open, tab, selectedAgentId]);

  const fetchAudit = useCallback(() => {
    if (!selectedAgentId) return;
    fetch(`/api/agents/${selectedAgentId}/audit?limit=20`)
      .then((r) => r.json())
      .then((data) => setAuditEntries(Array.isArray(data) ? data : []))
      .catch(() => setAuditEntries([]));
  }, [selectedAgentId]);

  useEffect(() => {
    if (tab === "kya" && selectedAgentId) fetchAudit();
  }, [tab, selectedAgentId, fetchAudit]);

  const handleSelectRun = useCallback(
    (runId: string) => {
      if (selectedRunId === runId) {
        setSelectedRunId(null);
        clearCanvasTrace();
        return;
      }
      const run = history.find((r) => r.id === runId);
      if (!run) return;
      const trace =
        typeof run.trace === "string" ? JSON.parse(run.trace || "[]") : run.trace ?? [];
      if (!Array.isArray(trace)) return;
      setSelectedRunId(runId);
      applyTraceToCanvas(trace);
    },
    [selectedRunId, history, setSelectedRunId]
  );

  const handleClose = useCallback(() => {
    if (selectedRunId) {
      setSelectedRunId(null);
      clearCanvasTrace();
    }
    setOpen(false);
  }, [selectedRunId, setSelectedRunId, setOpen]);

  if (!open) return null;

  const toggleTrace = (id: string) => {
    setExpandedTraces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "running":
        return <Clock className="size-3.5 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="size-3.5 text-emerald-500" />;
      case "failed":
        return <XCircle className="size-3.5 text-red-500" />;
      default:
        return <AlertCircle className="size-3.5 text-zinc-400" />;
    }
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white shadow-lg transition-all"
      style={{ height: "320px" }}
    >
      <div className="flex h-10 items-center justify-between border-b border-zinc-100 px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("runs")}
            className={`rounded px-2 py-1 text-xs font-medium ${tab === "runs" ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            Execution History
          </button>
          <button
            onClick={() => setTab("kya")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${tab === "kya" ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          >
            <Activity className="size-3" /> KYA Audit
          </button>
          {isExecuting && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              Running...
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleClose}>
          <X className="size-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-2.5rem)]">
        {tab === "kya" && (
          <div className="border-b border-zinc-100 px-4 py-2">
            <select
              value={selectedAgentId ?? ""}
              onChange={(e) => setSelectedAgentId(e.target.value || null)}
              className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="">Select agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {auditEntries.length === 0 && selectedAgentId && (
              <p className="mt-2 text-center text-xs text-zinc-400">No audit entries yet.</p>
            )}
            <div className="mt-2 space-y-1">
              {auditEntries.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center gap-2 rounded px-2 py-1 text-[11px] ${e.status === "blocked_mandate" || e.status === "blocked_revoked" || e.status === "anomaly_flagged" ? "bg-red-50 dark:bg-red-950/30" : "bg-zinc-50 dark:bg-zinc-900/50"}`}
                >
                  <span className="font-medium">{e.action}</span>
                  {e.amountCents != null && <span>{e.amountCents}¢</span>}
                  <Badge variant="outline" className="text-[9px]">{e.status}</Badge>
                  {e.anomalyScore != null && (
                    <span className={e.anomalyScore >= 0.7 ? "text-red-600" : "text-zinc-500"}>
                      score {e.anomalyScore.toFixed(2)}
                    </span>
                  )}
                  <span className="ml-auto text-zinc-400">
                    {new Date(e.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "runs" && (
        <div className="divide-y divide-zinc-100">
          {history.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
              No executions yet. Use the Run button to execute a workflow.
            </div>
          )}
          {history.map((run, index) => {
            const runKey = run.id ?? `run-${index}`;
            const expanded = expandedTraces.has(runKey);
            const trace =
              typeof run.trace === "string" ? JSON.parse(run.trace) : run.trace;
            const isSelected = selectedRunId === runKey;
            return (
              <div key={runKey} className={`px-4 py-2 ${isSelected ? "bg-blue-50 dark:bg-blue-950/20" : ""}`}>
                <div className="flex w-full items-center gap-3">
                  <button
                    onClick={() => toggleTrace(runKey)}
                    className="flex flex-1 items-center gap-3 text-left"
                  >
                    {expanded ? (
                      <ChevronDown className="size-3.5 text-zinc-400" />
                    ) : (
                      <ChevronRight className="size-3.5 text-zinc-400" />
                    )}
                    {statusIcon(run.status)}
                    <span className="text-xs font-medium text-zinc-700">
                      {run.trigger} run
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {run.status}
                    </Badge>
                    <span className="ml-auto text-[10px] text-zinc-400">
                      {new Date(run.startedAt).toLocaleString()}
                    </span>
                  </button>
                  {run.status !== "running" && (
                    <button
                      onClick={() => handleSelectRun(runKey)}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300"
                          : "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
                      }`}
                      title={isSelected ? "Clear node inspection" : "Inspect nodes on canvas"}
                    >
                      {isSelected ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                      {isSelected ? "Clear" : "Inspect"}
                    </button>
                  )}
                </div>
                {expanded && Array.isArray(trace) && (
                  <div className="ml-8 mt-2 space-y-2">
                    {trace.map(
                      (
                        step: {
                          nodeId: string;
                          duration: number;
                          decision?: string;
                          input?: unknown;
                          output?: unknown;
                        },
                        i: number,
                      ) => {
                        const inputStr =
                          step.input !== undefined && step.input !== null
                            ? typeof step.input === "string"
                              ? step.input
                              : JSON.stringify(step.input, null, 2)
                            : "{}";
                        const outputStr =
                          step.output !== undefined && step.output !== null
                            ? typeof step.output === "string"
                              ? step.output
                              : JSON.stringify(step.output, null, 2)
                            : "{}";
                        const outObj = step.output && typeof step.output === "object" && !Array.isArray(step.output) ? (step.output as Record<string, unknown>) : null;
                        const bodyStr = outObj?.body !== undefined && outObj?.body !== null
                          ? typeof outObj.body === "string"
                            ? outObj.body
                            : JSON.stringify(outObj.body, null, 2)
                          : null;
                        return (
                          <div key={i} className="rounded bg-zinc-50 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-2 px-2 py-1 text-[11px]">
                              <span className="font-mono text-zinc-500">
                                {step.nodeId}
                              </span>
                              <span className="text-zinc-400">
                                {step.duration}ms
                              </span>
                              {step.decision && (
                                <span className="text-amber-600">
                                  {step.decision}
                                </span>
                              )}
                            </div>
                            <details className="group">
                              <summary className="cursor-pointer px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100">
                                Input
                              </summary>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all border-t border-zinc-200 bg-zinc-100/80 px-2 py-1.5 font-mono text-[10px] text-zinc-700">
                                {inputStr}
                              </pre>
                            </details>
                            <details className="group">
                              <summary className="cursor-pointer px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100">
                                Output
                              </summary>
                              <pre className="max-h-32 overflow-auto whitespace-pre-wrap break-all border-t border-zinc-200 bg-zinc-100/80 px-2 py-1.5 font-mono text-[10px] text-zinc-700">
                                {outputStr}
                              </pre>
                            </details>
                            {bodyStr != null && (
                              <details className="group">
                                <summary className="cursor-pointer px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100">
                                  Response (integration body)
                                </summary>
                                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t border-zinc-200 bg-zinc-100/80 px-2 py-1.5 font-mono text-[10px] text-zinc-700">
                                  {bodyStr}
                                </pre>
                              </details>
                            )}
                          </div>
                        );
                      },
                    )}
                    {run.error && (
                      <div className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-600">
                        Error: {run.error}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}
      </ScrollArea>
    </div>
  );
}
