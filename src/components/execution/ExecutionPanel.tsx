"use client";

import { useEffect, useState } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useExecutionStore } from "@/lib/store/execution-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";

export function ExecutionPanel() {
  const open = useExecutionStore((s) => s.executionPanelOpen);
  const setOpen = useExecutionStore((s) => s.setExecutionPanelOpen);
  const activeRun = useExecutionStore((s) => s.activeRun);
  const history = useExecutionStore((s) => s.history);
  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const setHistory = useExecutionStore((s) => s.setHistory);
  const workflowId = useWorkflowStore((s) => s.id);

  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !workflowId) return;
    fetch(`/api/executions?workflowId=${workflowId}&limit=10`)
      .then((r) => r.json())
      .then((data) => {
        if (data.runs) setHistory(data.runs);
      })
      .catch(() => {});
  }, [open, workflowId, setHistory]);

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
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Execution History
          </span>
          {isExecuting && (
            <Badge variant="secondary" className="text-[10px] animate-pulse">
              Running...
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </div>
      <ScrollArea className="h-[calc(100%-2.5rem)]">
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
            return (
              <div key={runKey} className="px-4 py-2">
                <button
                  onClick={() => toggleTrace(runKey)}
                  className="flex w-full items-center gap-3 text-left"
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
                {expanded && Array.isArray(trace) && (
                  <div className="ml-8 mt-2 space-y-2">
                    {trace.map(
                      (
                        step: {
                          nodeId: string;
                          duration: number;
                          decision?: string;
                          output?: unknown;
                        },
                        i: number,
                      ) => {
                        const hasOutput =
                          step.output !== undefined &&
                          step.output !== null &&
                          (typeof step.output !== "object" ||
                            Object.keys(step.output as Record<string, unknown>).length > 0);
                        const outputStr =
                          hasOutput &&
                          (typeof step.output === "string"
                            ? step.output
                            : JSON.stringify(step.output, null, 2));
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
                            {hasOutput && outputStr && (
                              <details className="group">
                                <summary className="cursor-pointer px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-100">
                                  Response
                                </summary>
                                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all border-t border-zinc-200 bg-zinc-100/80 px-2 py-1.5 font-mono text-[10px] text-zinc-700">
                                  {outputStr}
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
      </ScrollArea>
    </div>
  );
}
