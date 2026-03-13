"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Play } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

function StartEventNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const status = data.executionStatus;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-500 bg-emerald-100 transition-all duration-300",
          selected && "ring-2 ring-emerald-400 ring-offset-2",
          status === "running" && "animate-pulse shadow-lg shadow-emerald-300",
          status === "completed" && "shadow-lg shadow-emerald-300 bg-emerald-200"
        )}
      >
        <Play className="h-6 w-6 fill-emerald-600 text-emerald-600" />
        <ExecutionStatusOverlay data={data} />
      </div>
      <span className="max-w-24 truncate text-center text-xs font-medium text-slate-700">
        {data.label}
      </span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-emerald-500 !bg-white"
      />
    </div>
  );
}

export const StartEventNode = memo(StartEventNodeComponent);
