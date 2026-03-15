"use client";

import { memo, useCallback } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";

interface ConditionalEdgeData {
  label?: string;
  condition?: string;
  animated?: boolean;
}

function ConditionalEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  selected,
}: EdgeProps & { data?: ConditionalEdgeData }) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const deleteEdge = useWorkflowStore((s) => s.deleteEdge);

  const onDelete = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      deleteEdge(id);
    },
    [id, deleteEdge]
  );

  const isAnimated = data?.animated ?? false;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: selected ? "#3b82f6" : "#94a3b8",
          strokeWidth: selected ? 2 : 1.5,
          ...(isAnimated && { strokeDasharray: "5 5" }),
        }}
        className={isAnimated ? "animate-dash" : ""}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          className="flex items-center gap-1"
        >
          {data?.label && (
            <span className="rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-600 shadow-sm">
              {data.label}
            </span>
          )}
          {selected && (
            <button
              onClick={onDelete}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-transform hover:scale-110 hover:bg-red-600"
              title="Delete connection"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ConditionalEdge = memo(ConditionalEdgeComponent);
