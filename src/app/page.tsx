"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExecutionHistorySheet } from "@/components/execution/ExecutionHistorySheet";
import { Plus, History } from "lucide-react";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Home() {
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchId, setSearchId] = useState("");
  const [historyWorkflow, setHistoryWorkflow] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/workflows")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load workflows");
        return res.json();
      })
      .then((data: unknown) => {
        if (!cancelled) {
          const list = Array.isArray(data)
            ? data
            : (data as { workflows?: WorkflowSummary[] }).workflows ?? [];
          const published = (list as WorkflowSummary[]).filter(
            (w) => w.status === "shadow" || w.status === "live"
          );
          setWorkflows(published);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    return workflows.filter((w) => {
      const matchName =
        !searchName.trim() ||
        w.name.toLowerCase().includes(searchName.trim().toLowerCase());
      const matchId =
        !searchId.trim() ||
        w.id.toLowerCase().includes(searchId.trim().toLowerCase());
      return matchName && matchId;
    });
  }, [workflows, searchName, searchId]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-900 px-3 text-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-tight text-white">
            CogniFlow
          </span>
          <span className="text-sm text-zinc-500">/ Workflows</span>
        </div>
        <Link
          href="/workflows/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          <Plus className="size-4" />
          Create workflow
        </Link>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="search-name"
              className="text-xs font-medium text-zinc-600"
            >
              Search by name
            </label>
            <Input
              id="search-name"
              type="text"
              placeholder="Filter by workflow name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="max-w-xs"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="search-id"
              className="text-xs font-medium text-zinc-600"
            >
              Search by workflow ID
            </label>
            <Input
              id="search-id"
              type="text"
              placeholder="Filter by workflow ID..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </div>

        {loading && (
          <p className="text-sm text-zinc-500">Loading workflows…</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <div className="space-y-1">
            <p className="text-sm text-zinc-500">
              {workflows.length === 0
                ? "No published workflows yet."
                : "No workflows match your search."}
            </p>
            {workflows.length === 0 && (
              <p className="text-xs text-zinc-400">
                From the editor, use Publish → Save to Cloud (choose Shadow or
                Live) to publish a workflow; it will then appear here.
              </p>
            )}
          </div>
        )}
        {!loading && !error && filtered.length > 0 && (
          <ScrollArea className="rounded-lg border border-zinc-200">
            <ul className="divide-y divide-zinc-100">
              {filtered.map((w) => (
                <li key={w.id} className="flex items-stretch">
                  <Link
                    href={`/workflows/${w.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span className="font-medium text-zinc-900">{w.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-mono">
                        {w.id}
                      </span>
                      <Badge
                        variant={
                          w.status === "live" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {w.status}
                      </Badge>
                    </div>
                  </Link>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger
                        render={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 min-w-24 shrink-0 gap-1.5 rounded-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
                            onClick={(e) => {
                              e.preventDefault();
                              setHistoryWorkflow({ id: w.id, name: w.name });
                            }}
                          >
                            <History className="size-4" />
                            History
                          </Button>
                        }
                      />
                      <TooltipContent side="bottom">
                        Execution history
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </main>
      <ExecutionHistorySheet
        workflowId={historyWorkflow?.id ?? ""}
        workflowName={historyWorkflow?.name}
        open={historyWorkflow !== null}
        onOpenChange={(open) => !open && setHistoryWorkflow(null)}
      />
    </div>
  );
}
