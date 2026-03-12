"use client";

import { MessageSquare, SlidersHorizontal } from "lucide-react";
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

  return (
    <aside className="flex w-72 flex-shrink-0 flex-col border-l border-zinc-200 bg-white">
      <Tabs
        value={rightPanelTab}
        onValueChange={(val) =>
          setRightPanelTab(val as "properties" | "chat")
        }
        className="flex flex-1 flex-col"
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

        <ScrollArea className="flex-1">
          <TabsContent value="properties" className="mt-0 flex-1">
            <NodeInspector />
          </TabsContent>
          <TabsContent value="chat" className="mt-0 flex-1">
            <WorkflowChat />
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}
