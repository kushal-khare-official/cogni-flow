"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, SlidersHorizontal, GripVertical } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useUIStore } from "@/lib/store/ui-store";
import { NodeInspector } from "@/components/inspector/NodeInspector";
import { WorkflowChat } from "@/components/inspector/WorkflowChat";

export function InspectorPanel() {
  const rightPanelTab = useUIStore((s) => s.rightPanelTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const rightPanelWidth = useUIStore((s) => s.rightPanelWidth);
  const setRightPanelWidth = useUIStore((s) => s.setRightPanelWidth);
  const [isResizing, setIsResizing] = useState(false);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return;
      const newWidth = window.innerWidth - e.clientX;
      setRightPanelWidth(newWidth);
    },
    [isResizing, setRightPanelWidth]
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
      className="relative flex min-h-0 flex-shrink-0 flex-col border-l border-zinc-200 bg-white"
      style={{ width: rightPanelWidth }}
    >
      {/* Resize handle */}
      <button
        type="button"
        aria-label="Resize panel"
        className="absolute left-0 top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center border-0 bg-transparent hover:bg-zinc-100/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        onMouseDown={(e) => {
          e.preventDefault();
          setIsResizing(true);
        }}
      >
        <GripVertical className="pointer-events-none size-4 text-zinc-400" />
      </button>
      <Tabs
        value={rightPanelTab}
        onValueChange={(val) =>
          setRightPanelTab(val as "properties" | "chat")
        }
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-zinc-100 px-2 pt-1">
          <TabsList className="w-full">
            <TabsTrigger value="properties" className="flex-1 gap-1.5 text-xs">
              <SlidersHorizontal className="size-3.5" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="chat" className="flex-1 gap-1.5 text-xs">
              <MessageSquare className="size-3.5" />
              Chat
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent
          value="properties"
          className="mt-0 flex min-h-0 flex-1 flex-col data-[hidden]:hidden"
        >
          <ScrollArea className="flex min-h-0 flex-1 flex-col">
            <NodeInspector />
          </ScrollArea>
        </TabsContent>
        <TabsContent
          value="chat"
          className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden data-[hidden]:hidden"
          keepMounted
        >
          <WorkflowChat />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
