"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { InspectorPanel } from "@/components/layout/InspectorPanel";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { ValidationPanel } from "@/components/validation/ValidationPanel";
import { PublishDialog } from "@/components/publish/PublishDialog";
import { ExecutionPanel } from "@/components/execution/ExecutionPanel";
import { useUIStore } from "@/lib/store/ui-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function WorkflowEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const validationPanelOpen = useUIStore((s) => s.validationPanelOpen);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("Missing workflow ID");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/workflows/${id}`)
      .then((res) => {
        if (res.status === 404) throw new Error("Workflow not found");
        if (!res.ok) throw new Error("Failed to load workflow");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setWorkflow({
            id: data.id,
            name: data.name ?? "Untitled Workflow",
            description: data.description ?? "",
            status: (data.status === "shadow" || data.status === "live"
              ? data.status
              : "draft") as "draft" | "shadow" | "live",
            nodes: Array.isArray(data.nodes) ? data.nodes : [],
            edges: Array.isArray(data.edges) ? data.edges : [],
          });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, setWorkflow]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-zinc-500">Loading workflow…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-sm text-red-600">{error}</p>
        <div className="flex gap-2">
          <Link href="/workflows">
            <Button variant="outline" size="sm" className="gap-1.5">
              <ArrowLeft className="size-4" />
              Back to list
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <Header />
      <div className="relative flex flex-1 overflow-hidden">
        {leftPanelOpen && <Sidebar />}
        <div className="relative flex-1">
          <WorkflowCanvas />
          {validationPanelOpen && <ValidationPanel />}
          <ExecutionPanel />
        </div>
        {rightPanelOpen && <InspectorPanel />}
      </div>
      <PublishDialog />
    </div>
  );
}
