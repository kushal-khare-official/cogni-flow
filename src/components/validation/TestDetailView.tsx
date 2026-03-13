"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import type { ValidationResult, BpmnNode, ExecutionTraceStep } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { NODE_TYPE_LABELS } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function CollapsibleJson({
  label,
  value,
  defaultOpen = false,
}: {
  label: string;
  value: unknown;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const str = formatJson(value);
  const isEmpty = str === "—" || str === "{}";

  return (
    <div className="border border-slate-100 rounded overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-left text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100"
      >
        {open ? (
          <ChevronDown className="size-3 shrink-0" />
        ) : (
          <ChevronRight className="size-3 shrink-0" />
        )}
        {label}
        {!isEmpty && (
          <span className="text-slate-400 font-normal">
            ({str.length} chars)
          </span>
        )}
      </button>
      {open && (
        <pre className="p-2 text-[10px] bg-white border-t border-slate-100 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-slate-700">
          {str}
        </pre>
      )}
    </div>
  );
}

interface TestDetailViewProps {
  result: ValidationResult;
  nodes: BpmnNode[];
}

export function TestDetailView({ result, nodes }: TestDetailViewProps) {
  const visitedIds = new Set(result.trace.map((s) => s.nodeId));
  const countByNodeId = new Map<string, number>();
  for (const step of result.trace) {
    countByNodeId.set(step.nodeId, (countByNodeId.get(step.nodeId) ?? 0) + 1);
  }

  const lastStep = result.trace[result.trace.length - 1];
  const lastNode = lastStep
    ? nodes.find((n) => n.id === lastStep.nodeId)
    : null;

  return (
    <div className="border-t border-slate-100 bg-slate-50/50">
      <div className="p-4 space-y-4">
        {/* Failure / Error section */}
        {(result.result === "fail" || result.result === "error") && (
          <section>
            <h4 className="text-xs font-semibold text-slate-700 mb-2">
              {result.result === "error" ? "Error" : "Why it failed"}
            </h4>
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {result.result === "error" && result.error && (
                <p className="font-medium">Exception: {result.error}</p>
              )}
              {result.result === "fail" && (
                <p>
                  Workflow did not reach an End event. Last node executed:{" "}
                  <strong>
                    {lastNode?.data?.label ?? lastStep?.nodeId ?? "—"}
                  </strong>
                  . The trace stopped before completing the flow.
                </p>
              )}
              {result.result === "error" && lastStep && (
                <p className="mt-1 text-red-700">
                  Error occurred at node:{" "}
                  <strong>{lastNode?.data?.label ?? lastStep.nodeId}</strong>
                </p>
              )}
            </div>
          </section>
        )}

        {/* Coverage breakdown */}
        <section>
          <h4 className="text-xs font-semibold text-slate-700 mb-2">
            Coverage — {result.coveragePercent}% ({visitedIds.size} / {nodes.length} nodes)
          </h4>
          <ul className="space-y-1 max-h-32 overflow-y-auto rounded border border-slate-100 bg-white p-2">
            {nodes.map((node) => {
              const visited = visitedIds.has(node.id);
              const count = countByNodeId.get(node.id);
              const typeLabel =
                NODE_TYPE_LABELS[node.data.bpmnType] ?? node.data.bpmnType;

              return (
                <li
                  key={node.id}
                  className={cn(
                    "flex items-center gap-2 text-xs py-1 px-1.5 rounded",
                    !visited && "bg-red-50 text-red-800"
                  )}
                >
                  {visited ? (
                    <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="size-3.5 text-red-500 shrink-0" />
                  )}
                  <span className="font-medium text-slate-700 truncate">
                    {node.data.label}
                  </span>
                  <span className="text-slate-400 shrink-0">{typeLabel}</span>
                  {visited && count !== undefined && count > 1 && (
                    <span className="text-emerald-600 font-medium shrink-0">
                      ×{count}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Execution trace timeline */}
        <section>
          <h4 className="text-xs font-semibold text-slate-700 mb-2">
            Execution trace ({result.trace.length} steps)
          </h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {result.trace.map((step: ExecutionTraceStep, idx: number) => {
              const node = nodes.find((n) => n.id === step.nodeId);
              const label = node?.data?.label ?? step.nodeId;
              const isLoopStep =
                node?.data?.bpmnType === BpmnNodeType.Loop && step.decision;

              return (
                <div
                  key={`${step.nodeId}-${idx}`}
                  className="rounded-lg border border-slate-200 bg-white p-2 text-xs"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-slate-500 w-6">{idx + 1}.</span>
                    <span className="font-medium text-slate-800">{label}</span>
                    {step.decision && (
                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                        {step.decision}
                      </span>
                    )}
                    <span className="text-slate-400">
                      {step.duration}ms
                    </span>
                  </div>
                  {isLoopStep && (
                    <div className="mt-1 text-[10px] text-slate-500">
                      Loop step — see decision above for iteration
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <CollapsibleJson label="Input" value={step.input} />
                    <CollapsibleJson label="Output" value={step.output} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
