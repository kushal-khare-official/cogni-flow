import {
  BpmnNodeType,
  getReactFlowNodeType,
  type BpmnNode,
  type BpmnEdge,
} from "@/lib/workflow/types";

const BPMN_TYPE_MAP: Record<string, BpmnNodeType> = {
  "bpmn:StartEvent": BpmnNodeType.StartEvent,
  "bpmn:EndEvent": BpmnNodeType.EndEvent,
  "bpmn:ServiceTask": BpmnNodeType.ServiceTask,
  "bpmn:UserTask": BpmnNodeType.UserTask,
  "bpmn:ScriptTask": BpmnNodeType.ScriptTask,
  "bpmn:SendTask": BpmnNodeType.SendTask,
  "bpmn:ReceiveTask": BpmnNodeType.ReceiveTask,
  "bpmn:ExclusiveGateway": BpmnNodeType.ExclusiveGateway,
  "bpmn:ParallelGateway": BpmnNodeType.ParallelGateway,
  "bpmn:InclusiveGateway": BpmnNodeType.InclusiveGateway,
};

function resolveIntermediateEventType(element: any): BpmnNodeType {
  const defs = element.eventDefinitions ?? [];
  for (const def of defs) {
    if (def.$type === "bpmn:TimerEventDefinition") return BpmnNodeType.TimerEvent;
    if (def.$type === "bpmn:ErrorEventDefinition") return BpmnNodeType.ErrorEvent;
  }
  return BpmnNodeType.IntermediateEvent;
}

function buildPositionMap(definitions: any): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();

  const diagrams: any[] = definitions.diagrams ?? [];
  for (const diagram of diagrams) {
    const planeElements: any[] = diagram.plane?.planeElement ?? [];
    for (const el of planeElements) {
      if (el.$type === "bpmndi:BPMNShape" && el.bounds) {
        const refId = el.bpmnElement?.id ?? el.bpmnElement;
        if (refId) {
          map.set(typeof refId === "string" ? refId : refId.id ?? refId, {
            x: el.bounds.x ?? 0,
            y: el.bounds.y ?? 0,
          });
        }
      }
    }
  }

  return map;
}

export function convertToReactFlow(definitions: any): {
  nodes: BpmnNode[];
  edges: BpmnEdge[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const nodes: BpmnNode[] = [];
  const edges: BpmnEdge[] = [];

  const process = definitions.rootElements?.find(
    (el: any) => el.$type === "bpmn:Process"
  );

  if (!process) {
    warnings.push("No bpmn:Process element found in definitions");
    return { nodes, edges, warnings };
  }

  const positionMap = buildPositionMap(definitions);
  const flowElements: any[] = process.flowElements ?? [];
  let autoX = 50;

  for (const element of flowElements) {
    const type = element.$type;

    if (type === "bpmn:SequenceFlow") {
      const edge: BpmnEdge = {
        id: element.id,
        source: element.sourceRef?.id ?? element.sourceRef,
        target: element.targetRef?.id ?? element.targetRef,
        type: "conditional",
        data: {
          label: element.name,
          condition: element.conditionExpression?.body,
        },
      };
      edges.push(edge);
      continue;
    }

    let bpmnType: BpmnNodeType | undefined = BPMN_TYPE_MAP[type];

    if (!bpmnType && (type === "bpmn:IntermediateCatchEvent" || type === "bpmn:IntermediateThrowEvent")) {
      bpmnType = resolveIntermediateEventType(element);
    }

    if (!bpmnType) {
      warnings.push(`Unknown BPMN element type: ${type} (id: ${element.id})`);
      continue;
    }

    const diPos = positionMap.get(element.id);
    const position = diPos ?? { x: autoX, y: 100 };
    if (!diPos) autoX += 250;

    const node: BpmnNode = {
      id: element.id,
      type: getReactFlowNodeType(bpmnType),
      position,
      data: {
        label: element.name || bpmnType,
        bpmnType,
        description: element.documentation?.[0]?.text,
      },
    };
    nodes.push(node);
  }

  return { nodes, edges, warnings };
}
