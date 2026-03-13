"use client";

import { useState, Fragment } from "react";
import { X, Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useUIStore } from "@/lib/store/ui-store";
import { useValidationStore } from "./validation-store";
import { runValidation } from "@/lib/workflow/validation";
import type { ValidationResult } from "@/lib/workflow/types";
import { TestDetailView } from "./TestDetailView";

export function ValidationPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useValidationStore((s) => s.results);
  const setResults = useValidationStore((s) => s.setResults);
  const selectedTestId = useValidationStore((s) => s.selectedTestId);
  const setSelectedTestId = useValidationStore((s) => s.setSelectedTestId);

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setValidationPanelOpen = useUIStore((s) => s.setValidationPanelOpen);
  const aiProvider = useUIStore((s) => s.aiProvider);
  const activeTraceId = useUIStore((s) => s.activeTraceId);
  const setActiveTraceId = useUIStore((s) => s.setActiveTraceId);

  const handleRunValidation = async () => {
    setLoading(true);
    setError(null);
    setResults([]);
    setActiveTraceId(null);
    setSelectedTestId(null);

    try {
      const res = await fetch("/api/ai/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: { nodes, edges },
          provider: aiProvider,
        }),
      });

      if (!res.ok) {
        throw new Error(`Validation API returned ${res.status}`);
      }

      const { testInputs } = await res.json();
      const validationResults = await runValidation(nodes, edges, testInputs);
      setResults(validationResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setLoading(false);
    }
  };

  const passed = results.filter((r) => r.result === "pass").length;
  const failed = results.filter((r) => r.result === "fail").length;
  const errored = results.filter((r) => r.result === "error").length;
  const avgCoverage =
    results.length > 0
      ? Math.round(
          results.reduce((sum, r) => sum + r.coveragePercent, 0) /
            results.length
        )
      : 0;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-40 flex h-72 flex-col border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-slate-800">
            Validation Results
          </h3>
          {results.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span>{results.length} tests</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600">{passed} passed</span>
              <span className="text-slate-300">|</span>
              <span className="text-red-600">{failed} failed</span>
              {errored > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-amber-600">{errored} error</span>
                </>
              )}
              <span className="text-slate-300">|</span>
              <span>{avgCoverage}% avg coverage</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleRunValidation}
            disabled={loading || nodes.length === 0}
          >
            {loading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Play className="size-3.5" />
            )}
            {loading ? "Running…" : "Run Validation"}
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setValidationPanelOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 overflow-auto">
        {loading && (
          <div className="flex h-full items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Generating test cases and running validation…
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex h-full items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="size-4" />
              {error}
            </div>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div className="flex h-full items-center justify-center py-12">
            <p className="text-sm text-slate-400">
              Click &quot;Run Validation&quot; to generate test cases and validate your workflow.
            </p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                <th className="px-4 py-2">Test Name</th>
                <th className="px-4 py-2">Result</th>
                <th className="px-4 py-2">Coverage</th>
                <th className="px-4 py-2">Branches Hit</th>
                <th className="px-4 py-2">Steps</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => {
                      const nextId = selectedTestId === r.id ? null : r.id;
                      setSelectedTestId(nextId);
                      setActiveTraceId(nextId);
                    }}
                    className={`cursor-pointer border-b border-slate-50 transition-colors hover:bg-slate-50 ${
                      selectedTestId === r.id
                        ? "bg-blue-50 hover:bg-blue-50"
                        : ""
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-slate-700">
                      {r.id}
                    </td>
                    <td className="px-4 py-2">
                      <ResultBadge result={r.result} error={r.error} />
                    </td>
                    <td className="px-4 py-2">
                      <CoverageBar value={r.coveragePercent} />
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.branchesHit.length}
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {r.trace.length}
                    </td>
                  </tr>
                  {selectedTestId === r.id && (
                    <tr>
                      <td colSpan={5} className="p-0 align-top">
                        <TestDetailView result={r} nodes={nodes} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </ScrollArea>
    </div>
  );
}

function ResultBadge({
  result,
  error,
}: {
  result: ValidationResult["result"];
  error?: string;
}) {
  switch (result) {
    case "pass":
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
          <CheckCircle2 className="size-3" />
          Pass
        </Badge>
      );
    case "fail":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200">
          <XCircle className="size-3" />
          Fail
        </Badge>
      );
    case "error":
      return (
        <Badge
          className="bg-amber-100 text-amber-700 border-amber-200"
          title={error}
        >
          <AlertTriangle className="size-3" />
          Error
        </Badge>
      );
  }
}

function CoverageBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-emerald-500"
      : value >= 50
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs text-slate-600">{value}%</span>
    </div>
  );
}
