"use client";

import type { DragEvent } from "react";
import { BpmnNodeType, type PaletteCategory } from "@/lib/workflow/types";
import { getNodeIcon } from "@/lib/node-icons";
import { getNodeCategory } from "@/lib/workflow/types";
import { cn } from "@/lib/utils";

interface PaletteItemProps {
  bpmnType: BpmnNodeType;
  label: string;
}

const CATEGORY_COLORS: Record<PaletteCategory, { bg: string; border: string; icon: string }> = {
  events: {
    bg: "bg-emerald-50 hover:bg-emerald-100",
    border: "border-emerald-200",
    icon: "text-emerald-600",
  },
  tasks: {
    bg: "bg-blue-50 hover:bg-blue-100",
    border: "border-blue-200",
    icon: "text-blue-600",
  },
  gateways: {
    bg: "bg-amber-50 hover:bg-amber-100",
    border: "border-amber-200",
    icon: "text-amber-600",
  },
  integrations: {
    bg: "bg-purple-50 hover:bg-purple-100",
    border: "border-purple-200",
    icon: "text-purple-600",
  },
  logic: {
    bg: "bg-gray-50 hover:bg-gray-100",
    border: "border-gray-200",
    icon: "text-gray-600",
  },
  actions: {
    bg: "bg-teal-50 hover:bg-teal-100",
    border: "border-teal-200",
    icon: "text-teal-600",
  },
};

export function PaletteItem({ bpmnType, label }: PaletteItemProps) {
  const Icon = getNodeIcon(bpmnType);
  const category = getNodeCategory(bpmnType);
  const colors = CATEGORY_COLORS[category];

  function handleDragStart(e: DragEvent<HTMLDivElement>) {
    e.dataTransfer.setData("application/cogniflow-node", bpmnType);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex cursor-grab flex-col items-center gap-1 rounded-md border p-2 transition-colors active:cursor-grabbing",
        colors.bg,
        colors.border,
      )}
    >
      <Icon className={cn("size-4", colors.icon)} />
      <span className="text-center text-[10px] font-medium leading-tight text-zinc-700">
        {label}
      </span>
    </div>
  );
}
