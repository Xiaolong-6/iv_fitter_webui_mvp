import type { Edge, Node } from "@xyflow/react";
import type { Mb3Component, Mb3Graph, Mb3PortRef } from "../domain/types";

const FORMULA_NODE_ID = "__mbv3_formula__";
const COMPONENT_WIDTH = 190;
const COMPONENT_HEIGHT = 54;
type Mb3PortSide = "top" | "right" | "bottom" | "left";

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

function graphBounds(graph: Mb3Graph): { right: number; top: number } {
  const boxes = [
    ...graph.nodes.map((node) => ({
      x: node.position.x,
      y: node.position.y,
      width: node.kind === "junction" ? 13 : 72,
      height: node.kind === "junction" ? 13 : 46,
    })),
    ...graph.components.map((component) => ({
      x: component.position.x,
      y: component.position.y,
      width: COMPONENT_WIDTH,
      height: COMPONENT_HEIGHT,
    })),
  ];

  if (!boxes.length) return { right: 760, top: 140 };
  return {
    right: Math.max(...boxes.map((box) => box.x + box.width)),
    top: Math.min(...boxes.map((box) => box.y)),
  };
}

function samePort(a: Mb3PortRef, b: Mb3PortRef): boolean {
  return a.kind === b.kind && a.id === b.id && (a.port ?? "node") === (b.port ?? "node");
}

function otherWireEnd(wire: Mb3Graph["wires"][number], port: Mb3PortRef): Mb3PortRef {
  return samePort(wire.from, port) ? wire.to : wire.from;
}

function portCenter(graph: Mb3Graph, port: Mb3PortRef): { x: number; y: number } | null {
  if (port.kind === "node") {
    const node = graph.nodes.find((candidate) => candidate.id === port.id);
    if (!node) return null;
    return {
      x: node.position.x + (node.kind === "junction" ? 6.5 : 36),
      y: node.position.y + (node.kind === "junction" ? 6.5 : 23),
    };
  }
  const component = graph.components.find((candidate) => candidate.id === port.id);
  if (!component) return null;
  return {
    x: component.position.x + COMPONENT_WIDTH / 2,
    y: component.position.y + COMPONENT_HEIGHT / 2,
  };
}

function sideFromVector(dx: number, dy: number, fallback: Mb3PortSide): Mb3PortSide {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
    return fallback;
  }
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

function oppositeSide(side: Mb3PortSide): Mb3PortSide {
  switch (side) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
  }
}

function componentPortSide(graph: Mb3Graph, component: Mb3Component, port: "p" | "n"): Mb3PortSide {
  const fallback = port === "p" ? "top" : "bottom";
  const selfPort: Mb3PortRef = { kind: "component", id: component.id, port };
  const touching = graph.wires.filter((wire) => samePort(wire.from, selfPort) || samePort(wire.to, selfPort));
  const center = portCenter(graph, selfPort);
  if (!touching.length || !center) return fallback;

  const vectors = touching
    .map((wire) => portCenter(graph, otherWireEnd(wire, selfPort)))
    .filter((point): point is { x: number; y: number } => Boolean(point))
    .map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
  if (!vectors.length) return fallback;
  const avg = vectors.reduce(
    (acc, vector) => ({ x: acc.x + vector.x, y: acc.y + vector.y }),
    { x: 0, y: 0 },
  );
  return sideFromVector(avg.x / vectors.length, avg.y / vectors.length, fallback);
}

function componentPortSides(graph: Mb3Graph, component: Mb3Component): Record<"p" | "n", Mb3PortSide> {
  const p = componentPortSide(graph, component, "p");
  const n = componentPortSide(graph, component, "n");
  return { p, n: p === n ? oppositeSide(p) : n };
}

function formulaNode(graph: Mb3Graph, formulaLatex: string[]): Node {
  const bounds = graphBounds(graph);
  return {
    id: FORMULA_NODE_ID,
    type: "mbv3Formula",
    position: { x: bounds.right + 80, y: bounds.top + 20 },
    draggable: false,
    selectable: false,
    connectable: false,
    data: { formulaLatex },
    style: {
      background: "transparent",
      border: 0,
      padding: 0,
      pointerEvents: "none",
      overflow: "visible",
    },
  };
}

export function mb3ToReactFlow(
  graph: Mb3Graph,
  formulaLatex: string[] = [],
  activeComponentIds: string[] = [],
): { nodes: Node[]; edges: Edge[] } {
  const adj = buildAdjacency(graph);
  const vId = graph.terminals.positive;
  const gndId = graph.terminals.ground;
  const fromVDist = bfsDistance(vId, adj);
  const fromGndDist = bfsDistance(gndId, adj);
  const activeComponents = new Set(activeComponentIds);

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
      data: { label: component.label, kind: "component", portSides: componentPortSides(graph, component) },
      style: {
        background: "transparent",
        border: 0,
        padding: 0,
        cursor: "grab",
        overflow: "visible",
      },
    })),
  ];

  if (formulaLatex.length) {
    nodes.push(formulaNode(graph, formulaLatex));
  }

  const edges: Edge[] = graph.wires.map((wire): Edge => {
    const dFrom = fromVDist.get(wire.from.id);
    const dTo = fromVDist.get(wire.to.id);
    const touchesInactiveComponent =
      (wire.from.kind === "component" && !activeComponents.has(wire.from.id)) ||
      (wire.to.kind === "component" && !activeComponents.has(wire.to.id));
    const touchesTerminalPath = !touchesInactiveComponent && (fromVDist.has(wire.from.id) || fromVDist.has(wire.to.id) || fromGndDist.has(wire.from.id) || fromGndDist.has(wire.to.id));
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
        stroke: touchesInactiveComponent ? "#94a3b8" : "#334155",
        strokeWidth: touchesInactiveComponent ? 2 : 2.2,
        strokeDasharray: touchesInactiveComponent ? "7 6" : undefined,
        opacity: touchesInactiveComponent ? 0.82 : 1,
      },
      data: touchesInactiveComponent
        ? { status: "inactive", reason: "Open branch: visible on canvas, ignored by fitting." }
        : undefined,
    };
  });

  return { nodes, edges };
}
