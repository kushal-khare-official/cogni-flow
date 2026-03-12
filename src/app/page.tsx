"use client";

import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InspectorPanel } from "@/components/layout/InspectorPanel";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { ValidationPanel } from "@/components/validation/ValidationPanel";
import { PublishDialog } from "@/components/publish/PublishDialog";
import { useUIStore } from "@/lib/store/ui-store";

export default function Home() {
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const validationPanelOpen = useUIStore((s) => s.validationPanelOpen);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="relative flex flex-1 overflow-hidden">
        {leftPanelOpen && <Sidebar />}
        <div className="relative flex-1">
          <WorkflowCanvas />
          {validationPanelOpen && <ValidationPanel />}
        </div>
        {rightPanelOpen && <InspectorPanel />}
      </div>
      <PublishDialog />
    </div>
  );
}
