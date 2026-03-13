"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

interface WorkflowSummary {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowsListPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchId, setSearchId] = useState("");

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
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-zinc-800 bg-zinc-900 px-3 text-white">
        <Link
          href="/"
          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          <ArrowLeft className="size-4" />
          Home
        </Link>
        <span className="text-sm font-bold tracking-tight text-white">
          CogniFlow
        </span>
        <span className="text-sm text-zinc-500">/ Published Workflows</span>
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
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/workflows/${w.id}`)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
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
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </main>
    </div>
  );
}
