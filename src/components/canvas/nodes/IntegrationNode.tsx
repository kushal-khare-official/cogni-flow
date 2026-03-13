"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Plug } from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { useIntegrationStore } from "@/lib/store/integration-store";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

function IntegrationNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const templates = useIntegrationStore((s) => s.templates);
  const template = templates.find((t) => t.id === data.integrationTemplateId);
  const status = data.executionStatus;

  const displayName = template?.name ?? data.label;
  const operationLabel = data.operationId
    ? (() => {
        if (!template) return data.operationId;
        const ops = JSON.parse(template.operations || "[]") as { id: string; name: string }[];
        return ops.find((o) => o.id === data.operationId)?.name ?? data.operationId;
      })()
    : null;

  return (
    <div
      className={cn(
        "relative w-44 min-h-16 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
        selected && "ring-2 ring-purple-400 shadow-md",
        status === "running" && "ring-2 ring-purple-400 animate-pulse shadow-purple-200 shadow-lg",
        status === "completed" && "ring-2 ring-emerald-400 shadow-emerald-200 shadow-lg border-emerald-300",
        status === "error" && "ring-2 ring-red-400 shadow-red-200 shadow-lg border-red-300"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-purple-500 !bg-white"
      />
      <div className="h-2 rounded-t-lg bg-purple-500" />
      <div className="flex items-start gap-2 px-3 py-2">
        <Plug className="mt-0.5 h-4 w-4 shrink-0 text-purple-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {displayName}
          </p>
          {operationLabel && (
            <p className="mt-0.5 truncate text-[10px] text-purple-500 font-medium">
              {operationLabel}
            </p>
          )}
          {data.description && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-500">
              {data.description}
            </p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-purple-500 !bg-white"
      />
      <ExecutionStatusOverlay data={data} />
    </div>
  );
}

export const IntegrationNode = memo(IntegrationNodeComponent);
