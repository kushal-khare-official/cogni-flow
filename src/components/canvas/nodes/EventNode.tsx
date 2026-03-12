"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock, AlertTriangle, Circle } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const EVENT_ICONS: Record<string, React.ElementType> = {
  [BpmnNodeType.TimerEvent]: Clock,
  [BpmnNodeType.ErrorEvent]: AlertTriangle,
  [BpmnNodeType.IntermediateEvent]: Circle,
};

function EventNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const Icon = EVENT_ICONS[data.bpmnType] ?? Circle;
  const status = data.executionStatus;

  return (
    <div className="flex flex-col items-center gap-1">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-white"
      />
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-400 bg-slate-50 transition-all duration-300",
          selected && "ring-2 ring-slate-400 ring-offset-2",
          status === "running" && "animate-pulse shadow-lg shadow-slate-300",
          status === "completed" && "shadow-lg shadow-emerald-300 border-emerald-400 bg-emerald-50"
        )}
      >
        <Icon className="h-5 w-5 text-slate-600" />
      </div>
      <span className="max-w-24 truncate text-center text-xs font-medium text-slate-700">
        {data.label}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-slate-400 !bg-white"
      />
    </div>
  );
}

export const EventNode = memo(EventNodeComponent);
