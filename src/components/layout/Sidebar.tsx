"use client";

import { useState, useEffect, useCallback } from "react";
import { GripVertical } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaletteSection } from "@/components/palette/PaletteSection";
import { PaletteItem } from "@/components/palette/PaletteItem";
import {
  type PaletteCategory,
  CATEGORY_LABELS,
  NODE_TYPE_CATEGORIES,
  NODE_TYPE_LABELS,
} from "@/lib/workflow/types";
import { useUIStore } from "@/lib/store/ui-store";

const CATEGORY_ORDER: PaletteCategory[] = [
  "events",
  "tasks",
  "gateways",
  "logic",
  "actions",
];

export function Sidebar() {
  const leftPanelWidth = useUIStore((s) => s.leftPanelWidth);
  const setLeftPanelWidth = useUIStore((s) => s.setLeftPanelWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      setLeftPanelWidth(e.clientX);
    },
    [isResizing, setLeftPanelWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (!isResizing) return;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return (
    <aside
      className="relative flex flex-shrink-0 flex-col border-r border-zinc-200 bg-white"
      style={{ width: leftPanelWidth }}
    >
      <div className="flex h-10 items-center border-b border-zinc-100 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
          Node Palette
        </span>
      </div>
      <ScrollArea className="flex-1 overflow-y-auto">
        <div className="py-1">
          {CATEGORY_ORDER.map((category) => (
            <PaletteSection
              key={category}
              title={CATEGORY_LABELS[category]}
            >
              {NODE_TYPE_CATEGORIES[category].map((nodeType) => (
                <PaletteItem
                  key={nodeType}
                  bpmnType={nodeType}
                  label={NODE_TYPE_LABELS[nodeType]}
                />
              ))}
            </PaletteSection>
          ))}
        </div>
      </ScrollArea>
      {/* Resize handle on right edge */}
      <button
        type="button"
        aria-label="Resize node palette"
        className="absolute right-0 top-0 z-10 flex h-full w-2 translate-x-1/2 cursor-col-resize items-center justify-center border-0 bg-transparent hover:bg-zinc-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      >
        <GripVertical className="pointer-events-none size-4 text-zinc-400" />
      </button>
    </aside>
  );
}
