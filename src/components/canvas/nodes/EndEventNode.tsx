"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Square, Webhook } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

function EndEventNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const status = data.executionStatus;
  const hasWebhook = typeof data.webhookUrl === "string" && data.webhookUrl.length > 0;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          "relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-red-500 bg-red-100 transition-all duration-300",
          selected && "ring-2 ring-red-400 ring-offset-2",
          status === "running" && "animate-pulse shadow-lg shadow-red-300",
          status === "completed" && "shadow-lg shadow-emerald-300 border-emerald-500 bg-emerald-100"
        )}
      >
        <Square className="h-5 w-5 fill-red-600 text-red-600" />
        <ExecutionStatusOverlay data={data} />
        {hasWebhook && (
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 shadow-sm">
            <Webhook className="h-3 w-3 text-white" />
          </div>
        )}
      </div>
      <span className="max-w-24 truncate text-center text-xs font-medium text-slate-700">
        {data.label}
      </span>
      {hasWebhook && (
        <span className="text-[9px] font-medium text-violet-500">Webhook</span>
      )}
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-red-500 !bg-white"
      />
    </div>
  );
}

export const EndEventNode = memo(EndEventNodeComponent);
