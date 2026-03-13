"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Repeat, Clock, GitFork } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

const LOGIC_ICONS: Record<string, React.ElementType> = {
  [BpmnNodeType.Loop]: Repeat,
  [BpmnNodeType.Wait]: Clock,
  [BpmnNodeType.SplitPath]: GitFork,
};

function LogicNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const Icon = LOGIC_ICONS[data.bpmnType] ?? Repeat;
  const status = data.executionStatus;

  return (
    <div
      className={cn(
        "relative w-36 min-h-14 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
        selected && "ring-2 ring-slate-400 shadow-md",
        status === "running" && "ring-2 ring-slate-400 animate-pulse shadow-slate-200 shadow-lg",
        status === "completed" && "ring-2 ring-emerald-400 shadow-emerald-200 shadow-lg border-emerald-300",
        status === "error" && "ring-2 ring-red-400 shadow-red-200 shadow-lg border-red-300"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-white"
      />
      <div className="h-2 rounded-t-lg bg-slate-400" />
      <div className="flex items-start gap-2 px-3 py-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {data.label}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-white"
      />
      <ExecutionStatusOverlay data={data} />
    </div>
  );
}

export const LogicNode = memo(LogicNodeComponent);
