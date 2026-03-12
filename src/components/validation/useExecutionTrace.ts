"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import type { ValidationResult } from "@/lib/workflow/types";

const MIN_STEP_DELAY = 150;
const MAX_STEP_DELAY = 1200;

function clampDuration(duration: number): number {
  return Math.max(MIN_STEP_DELAY, Math.min(duration, MAX_STEP_DELAY));
}

export function useExecutionTrace(
  results: ValidationResult[],
  activeTraceId: string | null
) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const prevTraceIdRef = useRef<string | null>(null);

  const resetAllNodes = useCallback(() => {
    const currentNodes = useWorkflowStore.getState().nodes;
    const needsReset = currentNodes.some(
      (n) => n.data.executionStatus && n.data.executionStatus !== "idle"
    );
    if (!needsReset) return;

    useWorkflowStore.setState({
      nodes: currentNodes.map((n) => ({
        ...n,
        data: { ...n.data, executionStatus: "idle" as const },
      })),
    });
  }, []);

  const clearTimeouts = useCallback(() => {
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
  }, []);

  const resetTrace = useCallback(() => {
    clearTimeouts();
    setIsAnimating(false);
    setCurrentStepIndex(-1);
    resetAllNodes();
  }, [clearTimeouts, resetAllNodes]);

  useEffect(() => {
    if (activeTraceId === prevTraceIdRef.current) return;
    prevTraceIdRef.current = activeTraceId;

    clearTimeouts();
    resetAllNodes();
    setCurrentStepIndex(-1);

    if (!activeTraceId) {
      setIsAnimating(false);
      return;
    }

    const match = results.find((r) => r.id === activeTraceId);
    if (!match || match.trace.length === 0) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);

    let cumulativeDelay = 100;
    const trace = match.trace;

    trace.forEach((step, idx) => {
      // Mark node as "running" at the start of this step
      const runTimeout = setTimeout(() => {
        setCurrentStepIndex(idx);
        useWorkflowStore.setState((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === step.nodeId
              ? { ...n, data: { ...n.data, executionStatus: "running" as const } }
              : n
          ),
        }));
      }, cumulativeDelay);
      timeoutsRef.current.push(runTimeout);

      const stepDuration = clampDuration(step.duration);

      // Mark node as "completed" after its duration
      const completeTimeout = setTimeout(() => {
        useWorkflowStore.setState((state) => ({
          nodes: state.nodes.map((n) =>
            n.id === step.nodeId
              ? { ...n, data: { ...n.data, executionStatus: "completed" as const } }
              : n
          ),
        }));

        if (idx === trace.length - 1) {
          setIsAnimating(false);
        }
      }, cumulativeDelay + stepDuration);
      timeoutsRef.current.push(completeTimeout);

      cumulativeDelay += stepDuration + 80;
    });

    return () => clearTimeouts();
  }, [activeTraceId, results, clearTimeouts, resetAllNodes]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
      resetAllNodes();
    };
  }, [clearTimeouts, resetAllNodes]);

  const activeResult = results.find((r) => r.id === activeTraceId);
  const totalSteps = activeResult?.trace.length ?? 0;

  return { isAnimating, currentStepIndex, totalSteps, resetTrace };
}
