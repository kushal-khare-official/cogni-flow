"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { ExecutionRunRecord } from "@/lib/store/execution-store";

interface ExecutionHistorySheetProps {
  workflowId: string;
  workflowName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusIcon(status: string) {
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
}

export function ExecutionHistorySheet({
  workflowId,
  workflowName,
  open,
  onOpenChange,
}: ExecutionHistorySheetProps) {
  const [runs, setRuns] = useState<ExecutionRunRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open || !workflowId) return;
    let cancelled = false;
    setLoading(true);
    setRuns([]);
    fetch(`/api/executions?workflowId=${workflowId}&limit=20`)
      .then((r) => r.json())
      .then((data: { runs?: ExecutionRunRecord[] }) => {
        if (!cancelled && data.runs) setRuns(data.runs);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, workflowId]);

  const toggleTrace = (id: string) => {
    setExpandedTraces((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="text-base">
            {workflowName ? `Execution history: ${workflowName}` : "Execution history"}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 -mx-4 px-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
              Loading…
            </div>
          )}
          {!loading && runs.length === 0 && (
            <div className="flex items-center justify-center py-12 text-sm text-zinc-400">
              No executions yet for this workflow.
            </div>
          )}
          {!loading && runs.length > 0 && (
            <div className="divide-y divide-zinc-100">
              {runs.map((run, index) => {
                const runKey = run.id ?? `run-${index}`;
                const expanded = expandedTraces.has(runKey);
                const trace =
                  typeof run.trace === "string"
                    ? JSON.parse(run.trace || "[]")
                    : run.trace ?? [];
                return (
                  <div key={runKey} className="py-2">
                    <button
                      type="button"
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
                            i: number
                          ) => {
                            const hasOutput =
                              step.output !== undefined &&
                              step.output !== null &&
                              (typeof step.output !== "object" ||
                                Object.keys(
                                  step.output as Record<string, unknown>
                                ).length > 0);
                            const outputStr =
                              hasOutput &&
                              (typeof step.output === "string"
                                ? step.output
                                : JSON.stringify(step.output, null, 2));
                            return (
                              <div
                                key={i}
                                className="rounded bg-zinc-50 overflow-hidden"
                              >
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
                          }
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
      </SheetContent>
    </Sheet>
  );
}
