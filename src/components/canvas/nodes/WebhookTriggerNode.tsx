"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Webhook } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

function WebhookTriggerNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const status = data.executionStatus;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className={cn(
          "relative flex h-14 w-14 items-center justify-center rounded-full border-[3px] transition-all duration-300",
          "border-emerald-500 bg-emerald-50 text-emerald-600",
          selected && "ring-2 ring-emerald-300 ring-offset-2 shadow-md",
          status === "running" && "ring-2 ring-emerald-400 animate-pulse shadow-emerald-200 shadow-lg",
          status === "completed" && "ring-2 ring-emerald-400 shadow-emerald-200 shadow-lg",
          status === "error" && "ring-2 ring-red-400 border-red-500 shadow-red-200 shadow-lg"
        )}
      >
        <Webhook className="h-6 w-6" />
        <ExecutionStatusOverlay data={data} />
      </div>
      <span className="max-w-24 text-center text-[11px] font-medium text-slate-700">
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

export const WebhookTriggerNode = memo(WebhookTriggerNodeComponent);
