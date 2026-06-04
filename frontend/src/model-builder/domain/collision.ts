import type { Mb3Graph, Mb3Point, Mb3PortRef } from "./types";
import { MB3_LAYOUT } from "./layout";

type Box = {
  id: string;
  kind: "node" | "component";
  x: number;
  y: number;
  width: number;
  height: number;
};

type Segment = {
  from: Mb3Point;
  to: Mb3Point;
  wireId: string;
  endpointIds: Set<string>;
};

function sizeForNode(kind: string) {
  if (kind === "terminal") return MB3_LAYOUT.terminal;
  return MB3_LAYOUT.junction;
}

function boxForRef(graph: Mb3Graph, ref: Mb3PortRef): Box | null {
  if (ref.kind === "component") {
    const component = graph.components.find((item) => item.id === ref.id);
    if (!component) return null;
    return { id: component.id, kind: "component", ...component.position, ...MB3_LAYOUT.component };
  }
  const node = graph.nodes.find((item) => item.id === ref.id);
  if (!node) return null;
  return { id: node.id, kind: "node", ...node.position, ...sizeForNode(node.kind) };
}

function portPoint(box: Box, ref: Mb3PortRef): Mb3Point {
  if (ref.kind === "component" && ref.port === "n") {
    return { x: box.x + box.width / 2, y: box.y + box.height };
  }
  if (ref.kind === "component" && ref.port === "p") {
    return { x: box.x + box.width / 2, y: box.y };
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

function buildBoxes(graph: Mb3Graph): Box[] {
  return [
    ...graph.nodes.map((node) => ({
      id: node.id,
      kind: "node" as const,
      ...node.position,
      ...sizeForNode(node.kind),
    })),
    ...graph.components.map((component) => ({
      id: component.id,
      kind: "component" as const,
      ...component.position,
      ...MB3_LAYOUT.component,
    })),
  ];
}

function buildSegments(graph: Mb3Graph): Segment[] {
  const segments: Segment[] = [];
  for (const wire of graph.wires) {
    const fromBox = boxForRef(graph, wire.from);
    const toBox = boxForRef(graph, wire.to);
    if (!fromBox || !toBox) continue;
    const from = portPoint(fromBox, wire.from);
    const to = portPoint(toBox, wire.to);
    const midY = (from.y + to.y) / 2;
    const points = [from, { x: from.x, y: midY }, { x: to.x, y: midY }, to];
    const endpointIds = new Set([wire.from.id, wire.to.id]);
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index];
      const b = points[index + 1];
      if (a.x === b.x && a.y === b.y) continue;
      segments.push({ from: a, to: b, wireId: wire.id, endpointIds });
    }
  }
  return segments;
}

function inflate(box: Box, amount: number): Box {
  return {
    ...box,
    x: box.x - amount,
    y: box.y - amount,
    width: box.width + amount * 2,
    height: box.height + amount * 2,
  };
}

function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function segmentIntersectsBox(segment: Segment, box: Box): boolean {
  const minX = Math.min(segment.from.x, segment.to.x);
  const maxX = Math.max(segment.from.x, segment.to.x);
  const minY = Math.min(segment.from.y, segment.to.y);
  const maxY = Math.max(segment.from.y, segment.to.y);
  return minX <= box.x + box.width && maxX >= box.x && minY <= box.y + box.height && maxY >= box.y;
}

function entitySize(graph: Mb3Graph, entityId: string) {
  const node = graph.nodes.find((item) => item.id === entityId);
  if (node) return sizeForNode(node.kind);
  return MB3_LAYOUT.component;
}

function hasCollision(graph: Mb3Graph, entityId: string, position: Mb3Point): boolean {
  const size = entitySize(graph, entityId);
  const candidate: Box = { id: entityId, kind: "component", ...position, ...size };
  const boxes = buildBoxes(graph);
  const otherBoxCollision = boxes.some((box) => {
    if (box.id === entityId) return false;
    return boxesOverlap(inflate(candidate, MB3_LAYOUT.boxGap), box);
  });
  if (otherBoxCollision) return true;

  const candidateForWire = inflate(candidate, MB3_LAYOUT.wireGap);
  return buildSegments(graph).some((segment) => {
    if (segment.endpointIds.has(entityId)) return false;
    return segmentIntersectsBox(segment, candidateForWire);
  });
}

function snap(value: number): number {
  return Math.round(value / MB3_LAYOUT.grid) * MB3_LAYOUT.grid;
}

export function resolveNonCollidingPosition(
  graph: Mb3Graph,
  entityId: string,
  desired: Mb3Point,
): Mb3Point {
  const start = { x: snap(desired.x), y: snap(desired.y) };
  if (!hasCollision(graph, entityId, start)) return start;

  for (let radius = MB3_LAYOUT.grid; radius <= MB3_LAYOUT.grid * 16; radius += MB3_LAYOUT.grid) {
    for (let dx = -radius; dx <= radius; dx += MB3_LAYOUT.grid) {
      for (let dy = -radius; dy <= radius; dy += MB3_LAYOUT.grid) {
        if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
        const candidate = { x: start.x + dx, y: start.y + dy };
        if (!hasCollision(graph, entityId, candidate)) return candidate;
      }
    }
  }
  return start;
}
