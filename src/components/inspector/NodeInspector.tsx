"use client";

import { SlidersHorizontal, Trash2 } from "lucide-react";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { getNodeIcon } from "@/lib/node-icons";
import {
  NODE_TYPE_LABELS,
  getNodeCategory,
  type BpmnNodeData,
} from "@/lib/workflow/types";
import { CONNECTOR_REGISTRY } from "@/lib/connectors/registry";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function NodeInspector() {
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const node = nodes.find((n) => n.id === selectedNodeId);

  if (!node) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-zinc-100">
          <SlidersHorizontal className="size-5 text-zinc-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-700">No node selected</p>
          <p className="mt-1 text-xs text-zinc-400">
            Select a node on the canvas to inspect and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const data = node.data;
  const Icon = getNodeIcon(data.bpmnType);
  const category = getNodeCategory(data.bpmnType);
  const isGateway = category === "gateways";
  const isConnector = category === "connectors";
  const connectorDef =
    isConnector && data.connectorType
      ? CONNECTOR_REGISTRY[data.connectorType]
      : data.bpmnType
        ? CONNECTOR_REGISTRY[data.bpmnType]
        : undefined;

  const outgoingEdges = edges.filter((e) => e.source === node.id);

  function update(patch: Partial<BpmnNodeData>) {
    if (selectedNodeId) updateNodeData(selectedNodeId, patch);
  }

  function handleDelete() {
    if (!selectedNodeId) return;
    deleteNode(selectedNodeId);
    selectNode(null);
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
            <Icon className="size-4 text-zinc-600" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-800">
              {data.label}
            </p>
            <Badge variant="secondary" className="mt-0.5 text-[10px]">
              {NODE_TYPE_LABELS[data.bpmnType]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleDelete}
          className="shrink-0 text-zinc-400 hover:text-red-500"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <Separator />

      {/* Label */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Label</Label>
        <Input
          value={data.label}
          onChange={(e) => update({ label: e.target.value })}
          className="text-sm"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs text-zinc-500">Description</Label>
        <Textarea
          value={data.description ?? ""}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Add a description…"
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {/* Gateway conditions */}
      {isGateway && outgoingEdges.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">Conditions</Label>
            {outgoingEdges.map((edge) => {
              const targetNode = nodes.find((n) => n.id === edge.target);
              const conditionEntry = data.conditions?.find(
                (c) => c.edgeId === edge.id
              );
              return (
                <div key={edge.id} className="space-y-1">
                  <p className="text-[11px] text-zinc-400">
                    → {targetNode?.data.label ?? edge.target}
                  </p>
                  <Input
                    value={conditionEntry?.expression ?? ""}
                    onChange={(e) => {
                      const existing = data.conditions ?? [];
                      const idx = existing.findIndex(
                        (c) => c.edgeId === edge.id
                      );
                      const updated = [...existing];
                      if (idx >= 0) {
                        updated[idx] = {
                          ...updated[idx],
                          expression: e.target.value,
                        };
                      } else {
                        updated.push({
                          edgeId: edge.id,
                          expression: e.target.value,
                        });
                      }
                      update({ conditions: updated });
                    }}
                    placeholder="e.g. amount > 100"
                    className="text-xs"
                  />
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Connector config fields */}
      {isConnector && connectorDef && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs text-zinc-500">
              {connectorDef.name} Config
            </Label>
            {connectorDef.configFields.map((field) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-[11px] text-zinc-400">
                  {field.label}
                  {field.required && (
                    <span className="ml-0.5 text-red-400">*</span>
                  )}
                </Label>
                <Input
                  type={field.type === "number" ? "number" : "text"}
                  value={
                    (data.connectorConfig?.[field.key] as string | number) ??
                    (field.default as string | number) ??
                    ""
                  }
                  onChange={(e) => {
                    const val =
                      field.type === "number"
                        ? Number(e.target.value)
                        : e.target.value;
                    update({
                      connectorConfig: {
                        ...data.connectorConfig,
                        [field.key]: val,
                      },
                    });
                  }}
                  className="text-xs"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Threshold */}
      {data.threshold !== undefined && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">Threshold</Label>
            <Input
              type="number"
              step="0.01"
              value={data.threshold}
              onChange={(e) => update({ threshold: Number(e.target.value) })}
              className="text-sm"
            />
          </div>
        </>
      )}

      {/* Confidence Score */}
      {data.confidenceScore !== undefined && (
        <div className="space-y-1.5">
          <Label className="text-xs text-zinc-500">Confidence Score</Label>
          <Input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={data.confidenceScore}
            onChange={(e) =>
              update({ confidenceScore: Number(e.target.value) })
            }
            className="text-sm"
          />
        </div>
      )}

      {/* Input Features */}
      {data.inputFeatures !== undefined && (
        <>
          <Separator />
          <div className="space-y-1.5">
            <Label className="text-xs text-zinc-500">
              Input Features{" "}
              <span className="font-normal text-zinc-400">
                (comma-separated)
              </span>
            </Label>
            <Input
              value={(data.inputFeatures ?? []).join(", ")}
              onChange={(e) =>
                update({
                  inputFeatures: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              placeholder="feature1, feature2"
              className="text-sm"
            />
          </div>
        </>
      )}
    </div>
  );
}
