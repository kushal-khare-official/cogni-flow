"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useExecutionStore } from "@/lib/store/execution-store";

export function RunDialog() {
  const [open, setOpen] = useState(false);
  const [inputJson, setInputJson] = useState("{}");
  const [liveMode, setLiveMode] = useState(true);

  const workflowId = useWorkflowStore((s) => s.id);
  const nodes = useWorkflowStore((s) => s.nodes);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);

  const isExecuting = useExecutionStore((s) => s.isExecuting);
  const setIsExecuting = useExecutionStore((s) => s.setIsExecuting);
  const setActiveRun = useExecutionStore((s) => s.setActiveRun);
  const addToHistory = useExecutionStore((s) => s.addToHistory);
  const setExecutionPanelOpen = useExecutionStore((s) => s.setExecutionPanelOpen);

  async function handleRun() {
    if (!workflowId || isExecuting) return;

    let input = {};
    try {
      input = JSON.parse(inputJson);
    } catch {
      alert("Invalid JSON input");
      return;
    }

    setIsExecuting(true);
    setExecutionPanelOpen(true);
    setOpen(false);

    nodes.forEach((n) => {
      updateNodeData(n.id, { executionStatus: "idle", executionOutput: undefined });
    });

    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflowId,
          input,
          mode: liveMode ? "live" : "mock",
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Execution failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              handleSSEData(data);
            } catch {
              /* skip malformed */
            }
          }
        }
      }
    } catch (err) {
      console.error("Execution error:", err);
    } finally {
      setIsExecuting(false);
    }
  }

  function handleSSEData(data: Record<string, unknown>) {
    if (data.nodeId && data.output === undefined && !data.error) {
      updateNodeData(data.nodeId as string, { executionStatus: "running" });
    } else if (data.nodeId && data.output !== undefined) {
      updateNodeData(data.nodeId as string, {
        executionStatus: "completed",
        executionOutput: data.output,
      });
    } else if (data.nodeId && data.error) {
      updateNodeData(data.nodeId as string, {
        executionStatus: "error",
        executionOutput: data.error,
      });
    } else if (data.runId && data.trace) {
      setActiveRun(data as any);
      addToHistory(data as any);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-emerald-300 hover:bg-zinc-800 hover:text-emerald-200"
            disabled={!workflowId}
          >
            <Play className="size-3.5" />
            Run
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Execute Workflow</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm">Execution Mode</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">Mock</span>
              <Switch checked={liveMode} onCheckedChange={setLiveMode} />
              <span className="text-xs text-zinc-500">Live</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Input JSON</Label>
            <Textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              rows={8}
              className="font-mono text-xs"
              placeholder='{ "email": "test@example.com", "amount": 1000 }'
            />
          </div>
          <Button
            onClick={handleRun}
            disabled={isExecuting || !workflowId}
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isExecuting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            {isExecuting ? "Executing..." : "Execute Workflow"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
