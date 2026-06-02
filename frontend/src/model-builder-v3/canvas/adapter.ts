import type { Edge, Node } from "@xyflow/react";
import type { Mb3Graph } from "../domain/types";

function buildAdjacency(graph: Mb3Graph): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, []);
  };
  for (const node of graph.nodes) ensure(node.id);
  for (const component of graph.components) ensure(component.id);
  for (const wire of graph.wires) {
    ensure(wire.from.id);
    ensure(wire.to.id);
    adj.get(wire.from.id)!.push(wire.to.id);
    adj.get(wire.to.id)!.push(wire.from.id);
  }
  return adj;
}

function bfsDistance(startId: string, adj: Map<string, string[]>): Map<string, number> {
  const dist = new Map<string, number>();
  if (!adj.has(startId)) return dist;
  const queue: string[] = [startId];
  dist.set(startId, 0);
  while (queue.length) {
    const id = queue.shift()!;
    const d = dist.get(id)!;
    for (const next of adj.get(id) ?? []) {
      if (!dist.has(next)) {
        dist.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  return dist;
}

export function mb3ToReactFlow(graph: Mb3Graph): { nodes: Node[]; edges: Edge[] } {
  const adj = buildAdjacency(graph);
  const vId = graph.terminals.positive;
  const gndId = graph.terminals.ground;
  const fromVDist = bfsDistance(vId, adj);
  const fromGndDist = bfsDistance(gndId, adj);

  const nodes: Node[] = [
    ...graph.nodes.map((node): Node => ({
      id: node.id,
      type:
        node.kind === "terminal"
          ? "mbv3Terminal"
          : node.kind === "junction"
            ? "mbv3Junction"
            : undefined,
      position: node.position,
      draggable: !node.locked,
      selectable: true,
      connectable: true,
      data: { label: node.label, role: node.role, kind: node.kind },
      style: {
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "grab",
        overflow: "visible",
      },
    })),
    ...graph.components.map((component): Node => ({
      id: component.id,
      type: "mbv3Component",
      position: component.position,
      draggable: true,
      selectable: true,
      connectable: true,
      data: { label: component.label, kind: "component" },
      style: {
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "grab",
        overflow: "visible",
      },
    })),
  ];

  const edges: Edge[] = graph.wires.map((wire): Edge => {
    const dFrom = fromVDist.get(wire.from.id);
    const dTo = fromVDist.get(wire.to.id);
    const touchesTerminalPath = fromVDist.has(wire.from.id) || fromVDist.has(wire.to.id) || fromGndDist.has(wire.from.id) || fromGndDist.has(wire.to.id);
    const shouldFlip = dFrom !== undefined && dTo !== undefined && dFrom > dTo;
    const source = shouldFlip ? wire.to : wire.from;
    const target = shouldFlip ? wire.from : wire.to;
    return {
      id: wire.id,
      source: source.id,
      sourceHandle: source.kind === "component" ? source.port : "node",
      target: target.id,
      targetHandle: target.kind === "component" ? target.port : "node",
      type: "step",
      animated: false,
      markerEnd: touchesTerminalPath ? { type: "arrowclosed", color: "#334155", width: 13, height: 13 } : undefined,
      style: {
        stroke: "#334155",
        strokeWidth: 2.2,
      },
    };
  });

  return { nodes, edges };
}
