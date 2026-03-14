"use client";

import { useState } from "react";
import { LayoutTemplate, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { DEMOS } from "@/lib/demos";
import type { BpmnNode, BpmnEdge } from "@/lib/workflow/types";

export function DemoGallery() {
  const [open, setOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);

  function handleLoad(demo: (typeof DEMOS)[number]) {
    setLoadingId(demo.id);
    setWorkflow({
      name: demo.name,
      description: demo.description,
      nodes: demo.nodes as BpmnNode[],
      edges: demo.edges as BpmnEdge[],
    });
    setLoadingId(null);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <LayoutTemplate className="size-3.5" />
            Demos
          </Button>
        }
      />
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="size-4" />
            Demo Workflows
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[28rem] pr-2">
          <div className="grid gap-3 py-2">
            {DEMOS.map((demo) => (
              <div
                key={demo.id}
                className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
              >
                <div>
                  <p className="font-medium text-zinc-900 dark:text-zinc-100">
                    {demo.name}
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {demo.description}
                  </p>
                  <p className="mt-1 text-[10px] text-zinc-400">
                    {demo.nodes.length} nodes · {demo.edges.length} edges
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit gap-1.5 text-xs"
                  onClick={() => handleLoad(demo)}
                  disabled={loadingId !== null}
                >
                  {loadingId === demo.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <LayoutTemplate className="size-3.5" />
                  )}
                  Load Workflow
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
