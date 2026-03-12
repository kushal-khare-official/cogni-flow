"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { X, Plus, Circle } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

const GATEWAY_ICONS: Record<string, React.ElementType> = {
  [BpmnNodeType.ExclusiveGateway]: X,
  [BpmnNodeType.ParallelGateway]: Plus,
  [BpmnNodeType.InclusiveGateway]: Circle,
};

function GatewayNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const Icon = GATEWAY_ICONS[data.bpmnType] ?? X;
  const status = data.executionStatus;

  return (
    <div className="flex flex-col items-center gap-1">
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-amber-500 !bg-white"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-2.5 !w-2.5 !border-2 !border-amber-500 !bg-white"
      />
      <div
        className={cn(
          "flex h-14 w-14 rotate-45 items-center justify-center border-2 border-amber-500 bg-amber-100 transition-all duration-300",
          selected && "ring-2 ring-amber-400 ring-offset-2",
          status === "running" && "animate-pulse shadow-lg shadow-amber-300",
          status === "completed" && "shadow-lg shadow-emerald-300 border-emerald-400 bg-emerald-100"
        )}
      >
        <Icon className="h-5 w-5 -rotate-45 text-amber-700" />
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-amber-500 !bg-white"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-2.5 !w-2.5 !border-2 !border-amber-500 !bg-white"
      />
      <span className="max-w-24 truncate text-center text-xs font-medium text-slate-700">
        {data.label}
      </span>
    </div>
  );
}

export const GatewayNode = memo(GatewayNodeComponent);
