"use client";

import { useCallback } from "react";
import {
  Sparkles,
  Send,
  PanelLeft,
  PanelRight,
  Play,
  Upload,
  Loader2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useUIStore } from "@/lib/store/ui-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { RunDialog } from "@/components/execution/RunDialog";
import { BpmnImportDialog } from "@/components/import/BpmnImportDialog";
import { CredentialManager } from "@/components/settings/CredentialManager";
import { IntegrationManager } from "@/components/settings/IntegrationManager";
import { ScheduleConfig } from "@/components/settings/ScheduleConfig";
import { WebhookConfig } from "@/components/settings/WebhookConfig";

const AI_PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
] as const;

export function Header() {
  const name = useWorkflowStore((s) => s.name);
  const setName = useWorkflowStore((s) => s.setName);
  const setWorkflow = useWorkflowStore((s) => s.setWorkflow);

  const promptValue = useUIStore((s) => s.promptValue);
  const setPromptValue = useUIStore((s) => s.setPromptValue);
  const isGenerating = useUIStore((s) => s.isGenerating);
  const setIsGenerating = useUIStore((s) => s.setIsGenerating);
  const aiProvider = useUIStore((s) => s.aiProvider);
  const setAiProvider = useUIStore((s) => s.setAiProvider);
  const toggleLeftPanel = useUIStore((s) => s.toggleLeftPanel);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const leftPanelOpen = useUIStore((s) => s.leftPanelOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const setValidationPanelOpen = useUIStore((s) => s.setValidationPanelOpen);
  const setPublishDialogOpen = useUIStore((s) => s.setPublishDialogOpen);

  const handleSubmit = useCallback(async () => {
    if (!promptValue.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: promptValue, provider: aiProvider }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.nodes || data.edges) {
          setWorkflow({ nodes: data.nodes, edges: data.edges });
        }
      }
    } catch {
      // Network errors are silently caught
    } finally {
      setIsGenerating(false);
    }
  }, [promptValue, isGenerating, aiProvider, setIsGenerating, setWorkflow]);

  return (
    <div className="flex-shrink-0">
      {/* Main header bar */}
      <div className="flex h-12 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3 text-white">
        {/* Left: Logo + workflow name */}
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggleLeftPanel}
                    className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  />
                }
              >
                <PanelLeft className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {leftPanelOpen ? "Hide sidebar" : "Show sidebar"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-white">
              CogniFlow
            </span>
            <Separator orientation="vertical" className="!h-5 bg-zinc-700" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-7 w-48 rounded-md border border-transparent bg-transparent px-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800 focus:border-zinc-600 focus:bg-zinc-800 focus:text-white focus:outline-none"
              spellCheck={false}
            />
          </div>
        </div>

        {/* Right: controls */}
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={aiProvider}
            onValueChange={(val) =>
              setAiProvider(val as "openai" | "anthropic" | "google")
            }
          >
            <SelectTrigger
              size="sm"
              className="h-7 w-28 border-zinc-700 bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="!h-5 bg-zinc-700" />

          <RunDialog />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setValidationPanelOpen(true)}
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Play className="size-3.5" />
            Validate
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPublishDialogOpen(true)}
            className="gap-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Upload className="size-3.5" />
            Publish
          </Button>

          <Separator orientation="vertical" className="!h-5 bg-zinc-700" />

          <BpmnImportDialog />
          <IntegrationManager />
          <CredentialManager />
          <ScheduleConfig />
          <WebhookConfig />

          <Separator orientation="vertical" className="!h-5 bg-zinc-700" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={toggleRightPanel}
                    className="flex size-8 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
                  />
                }
              >
                <PanelRight className="size-4" />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {rightPanelOpen ? "Hide inspector" : "Show inspector"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Prompt bar */}
      <div className="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <Sparkles className="size-4 shrink-0 text-amber-500" />
        <Input
          value={promptValue}
          onChange={(e) => setPromptValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe a workflow to generate with AI..."
          className="h-8 flex-1 border-zinc-200 bg-white text-sm"
          disabled={isGenerating}
        />
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={isGenerating || !promptValue.trim()}
          className="gap-1.5 bg-red-600 text-white hover:bg-red-700"
        >
          {isGenerating ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
          {isGenerating ? "Generating…" : "Submit"}
        </Button>
      </div>
    </div>
  );
}
