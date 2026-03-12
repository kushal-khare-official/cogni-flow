"use client";

import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/lib/store/ui-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import {
  CloudUploadIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  RadioIcon,
  ZapIcon,
} from "lucide-react";

type PublishMode = "shadow" | "live";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  draft: "outline",
  shadow: "secondary",
  live: "default",
};

export function PublishDialog() {
  const open = useUIStore((s) => s.publishDialogOpen);
  const setOpen = useUIStore((s) => s.setPublishDialogOpen);

  const workflowId = useWorkflowStore((s) => s.id);
  const workflowName = useWorkflowStore((s) => s.name);
  const workflowDescription = useWorkflowStore((s) => s.description);
  const workflowStatus = useWorkflowStore((s) => s.status);
  const workflowNodes = useWorkflowStore((s) => s.nodes);
  const workflowEdges = useWorkflowStore((s) => s.edges);
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);

  const [mode, setMode] = useState<PublishMode>("shadow");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setMode("shadow");
    setLoading(false);
    setSuccess(null);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) resetState();
    },
    [setOpen, resetState],
  );

  async function saveWorkflow() {
    const payload = {
      name: workflowName,
      description: workflowDescription,
      nodes: workflowNodes,
      edges: workflowEdges,
    };

    if (workflowId) {
      const res = await fetch(`/api/workflows/${workflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update workflow");
      return (await res.json()) as { id: string };
    }

    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to create workflow");
    return (await res.json()) as { id: string };
  }

  async function handleSaveDraft() {
    setLoading(true);
    try {
      const saved = await saveWorkflow();
      setWorkflow({ id: saved.id });
      setSuccess("draft");
      setTimeout(() => handleOpenChange(false), 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    setLoading(true);
    try {
      const saved = await saveWorkflow();
      setWorkflow({ id: saved.id });

      const res = await fetch(`/api/workflows/${saved.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) throw new Error("Failed to publish workflow");

      const published = (await res.json()) as { status: "shadow" | "live" };
      setWorkflow({ status: published.status });
      setSuccess(published.status);
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2Icon className="size-10 text-emerald-500" />
            <p className="text-base font-medium">Published successfully!</p>
            <Badge variant={STATUS_BADGE_VARIANT[success] ?? "outline"}>
              {success}
            </Badge>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Publish Workflow</DialogTitle>
              <DialogDescription>
                Save and deploy your workflow to the cloud.
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Workflow:</span>
              <span className="font-medium truncate">{workflowName}</span>
              <Badge variant={STATUS_BADGE_VARIANT[workflowStatus] ?? "outline"}>
                {workflowStatus}
              </Badge>
            </div>

            <Separator />

            <fieldset className="grid gap-2" disabled={loading}>
              <legend className="mb-1 text-sm font-medium">Publish Mode</legend>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  mode === "shadow"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="publish-mode"
                  className="sr-only"
                  checked={mode === "shadow"}
                  onChange={() => setMode("shadow")}
                />
                <RadioIcon
                  className={`mt-0.5 size-4 shrink-0 ${
                    mode === "shadow" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">Shadow Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Runs in parallel with live workflows. Results are logged but
                    not acted upon.
                  </p>
                </div>
              </label>

              <label
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  mode === "live"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <input
                  type="radio"
                  name="publish-mode"
                  className="sr-only"
                  checked={mode === "live"}
                  onChange={() => setMode("live")}
                />
                <ZapIcon
                  className={`mt-0.5 size-4 shrink-0 ${
                    mode === "live" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium">Live Mode</p>
                  <p className="text-xs text-muted-foreground">
                    Active production workflow. Replaces any existing live
                    version.
                  </p>
                </div>
              </label>
            </fieldset>

            <DialogFooter>
              <Button
                variant="outline"
                disabled={loading}
                onClick={handleSaveDraft}
              >
                {loading ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                Save Draft
              </Button>
              <Button disabled={loading} onClick={handlePublish}>
                {loading ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <CloudUploadIcon data-icon="inline-start" />
                )}
                Save to Cloud
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
