"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import {
  Cog,
  User,
  FileCode,
  Send,
  Inbox,
} from "lucide-react";
import type { BpmnNode } from "@/lib/workflow/types";
import { BpmnNodeType } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";
import { useIntegrationStore } from "@/lib/store/integration-store";
import { ExecutionStatusOverlay } from "./ExecutionStatusOverlay";

const TASK_ICONS: Record<string, React.ElementType> = {
  [BpmnNodeType.ServiceTask]: Cog,
  [BpmnNodeType.UserTask]: User,
  [BpmnNodeType.ScriptTask]: FileCode,
  [BpmnNodeType.SendTask]: Send,
  [BpmnNodeType.ReceiveTask]: Inbox,
};

function stepSummary(data: BpmnNode["data"]): string | null {
  const stepConfig = (data.stepConfig ?? {}) as Record<string, unknown>;
  if (data.integrationId && stepConfig) {
    if (stepConfig.method || stepConfig.path) {
      return `${(stepConfig.method as string) ?? "GET"} ${(stepConfig.path as string) ?? ""}`.trim();
    }
    if (stepConfig.toolName) return `tool: ${stepConfig.toolName as string}`;
    if (stepConfig.code) return "Code";
  }
  return null;
}

function TaskNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const Icon = TASK_ICONS[data.bpmnType] ?? Cog;
  const status = data.executionStatus;
  const integrations = useIntegrationStore((s) => s.integrations);
  const integration = data.integrationId
    ? integrations.find((t) => t.id === data.integrationId)
    : undefined;
  const summary = stepSummary(data);

  return (
    <div
      className={cn(
        "relative w-44 min-h-16 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
        selected && "ring-2 ring-blue-400 shadow-md",
        status === "running" && "ring-2 ring-blue-400 animate-pulse shadow-blue-200 shadow-lg",
        status === "completed" && "ring-2 ring-emerald-400 shadow-emerald-200 shadow-lg border-emerald-300",
        status === "error" && "ring-2 ring-red-400 shadow-red-200 shadow-lg border-red-300"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-2 !border-blue-500 !bg-white"
      />
      <div className="h-2 rounded-t-lg bg-blue-500" />
      <div className="flex items-start gap-2 px-3 py-2">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-slate-800">
            {data.label}
          </p>
          {integration && (
            <p className="mt-0.5 truncate text-[10px] text-blue-600 font-medium">
              {integration.name}
              {summary && ` · ${summary}`}
            </p>
          )}
          {data.description && !integration && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-500">
              {data.description}
            </p>
          )}
          {data.description && integration && (
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-slate-500">
              {data.description}
            </p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-2 !border-blue-500 !bg-white"
      />
      <ExecutionStatusOverlay data={data} />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
