"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { BpmnNodeData } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

function formatJson(value: unknown): string {
  if (value === undefined || value === null) return "—";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function JsonPreview({ value, label }: { value: unknown; label: string }) {
  const str = formatJson(value);
  const isLong = str.length > 200;
  const [expanded, setExpanded] = useState(false);
  const display = isLong && !expanded ? str.slice(0, 200) + "…" : str;

  return (
    <div className="text-left">
      <div className="font-medium text-slate-700 mb-0.5">{label}</div>
      <pre className="text-[10px] bg-slate-100 rounded p-1.5 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap break-words">
        {display}
      </pre>
      {isLong && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((x) => !x);
          }}
          className="mt-0.5 text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
        >
          {expanded ? (
            <>Less <ChevronUp className="size-3" /></>
          ) : (
            <>More <ChevronDown className="size-3" /></>
          )}
        </button>
      )}
    </div>
  );
}

export function ExecutionStatusOverlay({ data }: { data: BpmnNodeData }) {
  const status = data.executionStatus;
  const count = data.executionCount;
  const hasIO =
    status === "completed" &&
    (data.executionInput !== undefined || data.executionOutput !== undefined);

  if (!status || status === "idle") return null;

  return (
    <div className="absolute top-1 right-1 z-10 flex items-center gap-1 pointer-events-auto">
      {status === "running" && (
        <span className="rounded-full bg-blue-100 p-0.5" title="Running">
          <Loader2 className="size-3.5 text-blue-600 animate-spin" />
        </span>
      )}
      {status === "error" && (
        <span className="rounded-full bg-red-100 p-0.5" title="Error">
          <AlertCircle className="size-3.5 text-red-600" />
        </span>
      )}
      {status === "completed" && (
        <>
          <span
            className={cn(
              "flex items-center gap-0.5 rounded-full bg-emerald-100 px-1 py-0.5",
              count !== undefined && count > 1 && "pr-1.5"
            )}
            title="Completed"
          >
            <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
            {count !== undefined && count > 1 && (
              <span className="text-[10px] font-medium text-emerald-700">
                ×{count}
              </span>
            )}
          </span>
          {hasIO && (
            <Tooltip>
              <TooltipTrigger
                className="rounded bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 hover:bg-slate-300/80"
                onClick={(e) => e.stopPropagation()}
              >
                I/O
              </TooltipTrigger>
              <TooltipContent
                side="left"
                align="end"
                className="max-w-sm bg-white text-slate-800 border border-slate-200 shadow-lg p-2"
              >
                <div className="space-y-2">
                  <JsonPreview value={data.executionInput} label="Input" />
                  <JsonPreview value={data.executionOutput} label="Output" />
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </>
      )}
    </div>
  );
}
