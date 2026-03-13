"use client";

import { useState, useCallback, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/lib/store/ui-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";
import {
  CloudUploadIcon,
  SaveIcon,
  Loader2Icon,
  CheckCircle2Icon,
  RadioIcon,
  ZapIcon,
  CopyIcon,
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
  const [successId, setSuccessId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState(workflowName);

  useEffect(() => {
    if (open) setNameInput(workflowName);
  }, [open, workflowName]);

  const resetState = useCallback(() => {
    setMode("shadow");
    setLoading(false);
    setSuccess(null);
    setSuccessId(null);
  }, []);

  const nameTrimmed = nameInput.trim();
  const canSave = nameTrimmed.length > 0;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);
      if (!nextOpen) resetState();
    },
    [setOpen, resetState],
  );

  /** Save workflow to server (create or update); returns normalized workflow for store. */
  async function saveToServer(): Promise<{
    id: string;
    name: string;
    description: string;
    status: "draft" | "shadow" | "live";
    nodes: BpmnNode[];
    edges: BpmnEdge[];
  }> {
    const payload = {
      name: nameTrimmed,
      description: workflowDescription,
      nodes: workflowNodes,
      edges: workflowEdges,
    };
    const url = workflowId
      ? `/api/workflows/${workflowId}`
      : "/api/workflows";
    const method = workflowId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error ?? "Save failed");
    }
    const w = (await res.json()) as {
      id: string;
      name: string;
      description: string;
      status: string;
      nodes: string | BpmnNode[];
      edges: string | BpmnEdge[];
    };
    const nodes = Array.isArray(w.nodes) ? w.nodes : (JSON.parse(w.nodes as string) as BpmnNode[]);
    const edges = Array.isArray(w.edges) ? w.edges : (JSON.parse(w.edges as string) as BpmnEdge[]);
    return {
      id: w.id,
      name: w.name,
      description: w.description,
      status: (w.status as "draft" | "shadow" | "live") || "draft",
      nodes,
      edges,
    };
  }

  async function handleSaveDraft() {
    if (!canSave) return;
    setLoading(true);
    try {
      const saved = await saveToServer();
      setWorkflow({
        id: saved.id,
        name: saved.name,
        description: saved.description,
        status: saved.status,
      });
      setSuccess("draft");
      setSuccessId(saved.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePublish() {
    if (!canSave) return;
    setLoading(true);
    try {
      const saved = await saveToServer();
      setWorkflow({
        id: saved.id,
        name: saved.name,
        description: saved.description,
        status: saved.status,
        nodes: saved.nodes,
        edges: saved.edges,
      });

      const publishRes = await fetch(`/api/workflows/${saved.id}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      if (!publishRes.ok) {
        const err = await publishRes.json().catch(() => ({ error: publishRes.statusText }));
        throw new Error((err as { error?: string }).error ?? "Publish failed");
      }
      const published = (await publishRes.json()) as { status: string };
      setWorkflow({ status: published.status as "shadow" | "live" });
      setSuccess(published.status);
      setSuccessId(saved.id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function copyWorkflowId() {
    if (!successId) return;
    try {
      await navigator.clipboard.writeText(successId);
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2Icon className="size-10 text-emerald-500" />
            <p className="text-base font-medium">
              {success === "draft"
                ? "Draft saved"
                : "Published successfully!"}
            </p>
            <Badge variant={STATUS_BADGE_VARIANT[success] ?? "outline"}>
              {success}
            </Badge>
            {successId && (
              <div className="flex w-full flex-col gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-left">
                <span className="text-xs font-medium text-zinc-500">
                  Workflow ID
                </span>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs font-mono text-zinc-700">
                    {successId}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={copyWorkflowId}
                  >
                    <CopyIcon className="size-3.5" />
                  </Button>
                </div>
              </div>
            )}
            <Button
              className="mt-2"
              onClick={() => handleOpenChange(false)}
            >
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Publish Workflow</DialogTitle>
              <DialogDescription>
                Save and deploy your workflow to the cloud.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="publish-workflow-name">
                Workflow name
              </label>
              <Input
                id="publish-workflow-name"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Enter workflow name"
                className="font-medium"
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Status:</span>
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
                disabled={loading || !canSave}
                onClick={handleSaveDraft}
              >
                {loading ? (
                  <Loader2Icon className="animate-spin" data-icon="inline-start" />
                ) : (
                  <SaveIcon data-icon="inline-start" />
                )}
                Save Draft
              </Button>
              <Button
                disabled={loading || !canSave}
                onClick={handlePublish}
              >
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
