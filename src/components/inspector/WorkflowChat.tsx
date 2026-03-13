"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { Send, Bot, User, Loader2, Play } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useUIStore } from "@/lib/store/ui-store";
import { getReactFlowNodeType, BpmnNodeType } from "@/lib/workflow/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";

interface WorkflowPatch {
  action:
    | "add_node"
    | "remove_node"
    | "update_node"
    | "add_edge"
    | "remove_edge";
  payload: Record<string, unknown>;
}

function getMessageText(msg: UIMessage): string {
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("");
}

function extractWorkflowPatches(content: string): WorkflowPatch[] {
  const regex = /```workflowPatch\s*\n([\s\S]*?)```/g;
  const patches: WorkflowPatch[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      if (Array.isArray(parsed)) {
        patches.push(...parsed);
      } else {
        patches.push(parsed);
      }
    } catch {
      // skip malformed patches
    }
  }
  return patches;
}

function stripCodeFences(content: string): string {
  return content.replace(/```workflowPatch\s*\n[\s\S]*?```/g, "").trim();
}

export function WorkflowChat() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);
  const aiProvider = useUIStore((s) => s.aiProvider);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState("");

  const { messages, sendMessage, status, error, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/ai/chat",
      body: {
        workflow: { nodes, edges },
        provider: aiProvider,
      },
    }),
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const applyPatches = useCallback(
    (patches: WorkflowPatch[]) => {
      let currentNodes = [...useWorkflowStore.getState().nodes];
      let currentEdges = [...useWorkflowStore.getState().edges];

      for (const patch of patches) {
        switch (patch.action) {
          case "add_node": {
            const p = patch.payload;
            const id = (p.id as string) ?? `node-${uuidv4().slice(0, 8)}`;
            const bpmnType = p.bpmnType as BpmnNodeType;
            currentNodes = [
              ...currentNodes,
              {
                id,
                type: getReactFlowNodeType(bpmnType),
                position: (p.position as { x: number; y: number }) ?? {
                  x: 250,
                  y: 250,
                },
                data: {
                  label: (p.label as string) ?? "New Node",
                  bpmnType,
                  ...(p.data as Record<string, unknown> | undefined),
                },
              },
            ];
            break;
          }
          case "remove_node": {
            const nodeId = patch.payload.id as string;
            currentNodes = currentNodes.filter((n) => n.id !== nodeId);
            currentEdges = currentEdges.filter(
              (e) => e.source !== nodeId && e.target !== nodeId
            );
            break;
          }
          case "update_node": {
            const nodeId = patch.payload.id as string;
            const data = patch.payload.data as Record<string, unknown>;
            currentNodes = currentNodes.map((n) =>
              n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
            );
            break;
          }
          case "add_edge": {
            const p = patch.payload;
            currentEdges = [
              ...currentEdges,
              {
                id:
                  (p.id as string) ??
                  `e-${p.source}-${p.target}-${uuidv4().slice(0, 8)}`,
                source: p.source as string,
                target: p.target as string,
                type: "conditional",
              },
            ];
            break;
          }
          case "remove_edge": {
            const edgeId = patch.payload.id as string;
            currentEdges = currentEdges.filter((e) => e.id !== edgeId);
            break;
          }
        }
      }

      setWorkflow({ nodes: currentNodes, edges: currentEdges });
    },
    [setWorkflow]
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    sendMessage({ text });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Messages - same draggable ScrollArea as node palette; wrapper enforces height so scrollbar appears */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <ScrollArea
          viewportRef={scrollRef}
          className="h-full"
        >
          <div className="flex flex-col gap-3 py-3 pl-3 pr-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-zinc-100">
                <Bot className="size-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600">
                AI Workflow Assistant
              </p>
              <p className="text-xs text-zinc-400">
                Ask questions or request changes to your workflow
              </p>
            </div>
          )}

          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const text = getMessageText(msg);
            const patches = !isUser ? extractWorkflowPatches(text) : [];
            const displayContent = !isUser ? stripCodeFences(text) : text;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"}`}
              >
                <div
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    isUser ? "bg-blue-100" : "bg-zinc-100"
                  }`}
                >
                  {isUser ? (
                    <User className="size-3 text-blue-600" />
                  ) : (
                    <Bot className="size-3 text-zinc-500" />
                  )}
                </div>
                <div
                  className={`flex max-w-[85%] flex-col gap-1.5 rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                    isUser
                      ? "bg-blue-600 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  <span className="whitespace-pre-wrap">{displayContent}</span>
                  {patches.length > 0 && (
                    <Button
                      variant="secondary"
                      size="xs"
                      className="mt-1 self-start gap-1"
                      onClick={() => applyPatches(patches)}
                    >
                      <Play className="size-3" />
                      Apply Changes
                    </Button>
                  )}
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 px-1">
              <Loader2 className="size-3.5 animate-spin text-zinc-400" />
              <span className="text-xs text-zinc-400">Thinking…</span>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              <p className="font-medium">Something went wrong</p>
              <p className="mt-0.5 text-xs text-red-600">
                {error.message}
              </p>
              <Button
                variant="outline"
                size="xs"
                className="mt-2 border-red-200 text-red-700 hover:bg-red-100"
                onClick={() => clearError()}
              >
                Dismiss
              </Button>
            </div>
          )}
          </div>
        </ScrollArea>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-100 p-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your workflow…"
            rows={1}
            className="min-h-[36px] flex-1 resize-none text-sm"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="shrink-0 self-end"
          >
            <Send className="size-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
