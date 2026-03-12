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

const TASK_ICONS: Record<string, React.ElementType> = {
  [BpmnNodeType.ServiceTask]: Cog,
  [BpmnNodeType.UserTask]: User,
  [BpmnNodeType.ScriptTask]: FileCode,
  [BpmnNodeType.SendTask]: Send,
  [BpmnNodeType.ReceiveTask]: Inbox,
};

function TaskNodeComponent({ data, selected }: NodeProps<BpmnNode>) {
  const Icon = TASK_ICONS[data.bpmnType] ?? Cog;
  const status = data.executionStatus;

  return (
    <div
      className={cn(
        "w-44 min-h-16 rounded-lg border border-slate-200 bg-white shadow-sm transition-all duration-300",
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
        className="!h-2.5 !w-2.5 !border-2 !border-blue-500 !bg-white"
      />
    </div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
