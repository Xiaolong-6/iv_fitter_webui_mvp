import type { Mb3Graph, Mb3PortRef } from "../domain/types";

export type Mb3Point = { x: number; y: number };
type Mb3PortSide = "top" | "right" | "bottom" | "left";
type Mb3Rect = { x: number; y: number; width: number; height: number; id: string };

const COMPONENT_WIDTH = 190;
const COMPONENT_HEIGHT = 54;
const TERMINAL_WIDTH = 72;
const TERMINAL_HEIGHT = 46;
const JUNCTION_SIZE = 13;
const OBSTACLE_PADDING = 18;
const ROUTE_STEP = 24;
const MAX_ROUTE_STEPS = 6000;

function samePort(a: Mb3PortRef, b: Mb3PortRef): boolean {
  return a.kind === b.kind && a.id === b.id && (a.port ?? "node") === (b.port ?? "node");
}

function compactPoints(points: Mb3Point[]): Mb3Point[] {
  const withoutDuplicates = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
  return withoutDuplicates.filter((point, index, list) => {
    const previous = list[index - 1];
    const next = list[index + 1];
    if (!previous || !next) return true;
    return !(
      (previous.x === point.x && point.x === next.x) ||
      (previous.y === point.y && point.y === next.y)
    );
  });
}

function expanded(rect: Mb3Rect, padding = OBSTACLE_PADDING): Mb3Rect {
  return {
    ...rect,
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function boxes(graph: Mb3Graph): Mb3Rect[] {
  return [
    ...graph.components.map((component) => ({
      id: component.id,
      x: component.position.x,
      y: component.position.y,
      width: COMPONENT_WIDTH,
      height: COMPONENT_HEIGHT,
    })),
    ...graph.nodes.map((node) => ({
      id: node.id,
      x: node.position.x,
      y: node.position.y,
      width: node.kind === "terminal" ? TERMINAL_WIDTH : JUNCTION_SIZE,
      height: node.kind === "terminal" ? TERMINAL_HEIGHT : JUNCTION_SIZE,
    })),
  ];
}

function componentPortSide(graph: Mb3Graph, componentId: string, port: "p" | "n"): Mb3PortSide {
  const fallback = port === "p" ? "top" : "bottom";
  const selfPort: Mb3PortRef = { kind: "component", id: componentId, port };
  const component = graph.components.find((candidate) => candidate.id === componentId);
  if (!component) return fallback;
  const selfCenter = {
    x: component.position.x + COMPONENT_WIDTH / 2,
    y: component.position.y + COMPONENT_HEIGHT / 2,
  };
  const touching = graph.wires.filter((wire) => samePort(wire.from, selfPort) || samePort(wire.to, selfPort));
  const vectors = touching
    .map((wire) => {
      const other = samePort(wire.from, selfPort) ? wire.to : wire.from;
      const point = portCenter(graph, other);
      return point ? { x: point.x - selfCenter.x, y: point.y - selfCenter.y } : null;
    })
    .filter((vector): vector is Mb3Point => Boolean(vector));
  if (!vectors.length) return fallback;
  const average = vectors.reduce((acc, vector) => ({ x: acc.x + vector.x, y: acc.y + vector.y }), { x: 0, y: 0 });
  return sideFromVector(average.x / vectors.length, average.y / vectors.length, fallback);
}

function sideFromVector(dx: number, dy: number, fallback: Mb3PortSide): Mb3PortSide {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) return fallback;
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "bottom" : "top";
}

function portCenter(graph: Mb3Graph, port: Mb3PortRef): Mb3Point | null {
  if (port.kind === "component") {
    const component = graph.components.find((candidate) => candidate.id === port.id);
    if (!component) return null;
    return {
      x: component.position.x + COMPONENT_WIDTH / 2,
      y: component.position.y + COMPONENT_HEIGHT / 2,
    };
  }
  const node = graph.nodes.find((candidate) => candidate.id === port.id);
  if (!node) return null;
  return {
    x: node.position.x + (node.kind === "terminal" ? TERMINAL_WIDTH / 2 : JUNCTION_SIZE / 2),
    y: node.position.y + (node.kind === "terminal" ? TERMINAL_HEIGHT / 2 : JUNCTION_SIZE / 2),
  };
}

function portPoint(
  graph: Mb3Graph,
  port: Mb3PortRef,
  toward?: Mb3PortRef,
): { point: Mb3Point; side: Mb3PortSide } | null {
  if (port.kind === "component") {
    const component = graph.components.find((candidate) => candidate.id === port.id);
    if (!component) return null;
    const side = componentPortSide(graph, component.id, port.port ?? "p");
    const center = {
      x: component.position.x + COMPONENT_WIDTH / 2,
      y: component.position.y + COMPONENT_HEIGHT / 2,
    };
    if (side === "top") return { side, point: { x: center.x, y: component.position.y } };
    if (side === "bottom") return { side, point: { x: center.x, y: component.position.y + COMPONENT_HEIGHT } };
    if (side === "left") return { side, point: { x: component.position.x, y: center.y } };
    return { side, point: { x: component.position.x + COMPONENT_WIDTH, y: center.y } };
  }

  const node = graph.nodes.find((candidate) => candidate.id === port.id);
  if (!node) return null;
  if (node.kind === "terminal") {
    const side = node.role === "ground" ? "top" : "bottom";
    return {
      side,
      point: {
        x: node.position.x + TERMINAL_WIDTH / 2,
        y: node.position.y + (node.role === "ground" ? 0 : TERMINAL_HEIGHT),
      },
    };
  }
  const point = {
    x: node.position.x + JUNCTION_SIZE / 2,
    y: node.position.y + JUNCTION_SIZE / 2,
  };
  const target = toward ? portCenter(graph, toward) : null;
  const side = target
    ? sideFromVector(target.x - point.x, target.y - point.y, "bottom")
    : "bottom";
  return {
    side,
    point,
  };
}

function offsetPoint(point: Mb3Point, side: Mb3PortSide, distance = ROUTE_STEP): Mb3Point {
  if (side === "top") return { x: point.x, y: point.y - distance };
  if (side === "bottom") return { x: point.x, y: point.y + distance };
  if (side === "left") return { x: point.x - distance, y: point.y };
  return { x: point.x + distance, y: point.y };
}

function pointKey(point: Mb3Point): string {
  return `${point.x},${point.y}`;
}

function segmentIntersectsRect(a: Mb3Point, b: Mb3Point, rect: Mb3Rect): boolean {
  if (a.x === b.x) {
    const minY = Math.min(a.y, b.y);
    const maxY = Math.max(a.y, b.y);
    return a.x > rect.x && a.x < rect.x + rect.width && maxY > rect.y && minY < rect.y + rect.height;
  }
  if (a.y === b.y) {
    const minX = Math.min(a.x, b.x);
    const maxX = Math.max(a.x, b.x);
    return a.y > rect.y && a.y < rect.y + rect.height && maxX > rect.x && minX < rect.x + rect.width;
  }
  return false;
}

function segmentTouchesRoute(a: Mb3Point, b: Mb3Point, route: Mb3Point[]): number {
  let penalty = 0;
  for (let index = 0; index < route.length - 1; index += 1) {
    const c = route[index];
    const d = route[index + 1];
    if (a.x === b.x && c.y === d.y) {
      if (a.x >= Math.min(c.x, d.x) && a.x <= Math.max(c.x, d.x)
        && c.y >= Math.min(a.y, b.y) && c.y <= Math.max(a.y, b.y)) {
        penalty += 80;
      }
    } else if (a.y === b.y && c.x === d.x) {
      if (c.x >= Math.min(a.x, b.x) && c.x <= Math.max(a.x, b.x)
        && a.y >= Math.min(c.y, d.y) && a.y <= Math.max(c.y, d.y)) {
        penalty += 80;
      }
    } else if (a.x === b.x && c.x === d.x && a.x === c.x) {
      const overlap = Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y))
        - Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y));
      if (overlap > 0) penalty += 35 + overlap * 0.5;
    } else if (a.y === b.y && c.y === d.y && a.y === c.y) {
      const overlap = Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x))
        - Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x));
      if (overlap > 0) penalty += 35 + overlap * 0.5;
    }
  }
  return penalty;
}

function routeCost(points: Mb3Point[], existingRoutes: Mb3Point[][]): number {
  let cost = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index];
    const b = points[index + 1];
    cost += Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    for (const route of existingRoutes) {
      cost += segmentTouchesRoute(a, b, route);
    }
    if (index > 0) cost += 16;
  }
  return cost;
}

function buildGrid(start: Mb3Point, end: Mb3Point, rects: Mb3Rect[]): { xs: number[]; ys: number[] } {
  const xs = new Set<number>([start.x, end.x]);
  const ys = new Set<number>([start.y, end.y]);
  for (const rect of rects) {
    xs.add(rect.x);
    xs.add(rect.x + rect.width);
    xs.add(rect.x - ROUTE_STEP);
    xs.add(rect.x + rect.width + ROUTE_STEP);
    ys.add(rect.y);
    ys.add(rect.y + rect.height);
    ys.add(rect.y - ROUTE_STEP);
    ys.add(rect.y + rect.height + ROUTE_STEP);
  }
  return {
    xs: [...xs].sort((a, b) => a - b),
    ys: [...ys].sort((a, b) => a - b),
  };
}

function reconstruct(cameFrom: Map<string, string>, points: Map<string, Mb3Point>, endKey: string): Mb3Point[] {
  const path: Mb3Point[] = [];
  let current: string | undefined = endKey;
  while (current) {
    const point = points.get(current);
    if (point) path.push(point);
    current = cameFrom.get(current);
  }
  return compactPoints(path.reverse());
}

function findGridPath(
  start: Mb3Point,
  end: Mb3Point,
  obstacles: Mb3Rect[],
  existingRoutes: Mb3Point[][],
): Mb3Point[] {
  const grid = buildGrid(start, end, obstacles);
  const points = new Map<string, Mb3Point>();
  for (const x of grid.xs) {
    for (const y of grid.ys) {
      const point = { x, y };
      points.set(pointKey(point), point);
    }
  }
  const startKey = pointKey(start);
  const endKey = pointKey(end);
  points.set(startKey, start);
  points.set(endKey, end);

  const open = new Set<string>([startKey]);
  const cameFrom = new Map<string, string>();
  const costSoFar = new Map<string, number>([[startKey, 0]]);
  let steps = 0;

  while (open.size && steps < MAX_ROUTE_STEPS) {
    steps += 1;
    let currentKey = [...open][0];
    let currentScore = Number.POSITIVE_INFINITY;
    for (const key of open) {
      const point = points.get(key)!;
      const score = (costSoFar.get(key) ?? 0) + Math.abs(point.x - end.x) + Math.abs(point.y - end.y);
      if (score < currentScore) {
        currentScore = score;
        currentKey = key;
      }
    }
    if (currentKey === endKey) return reconstruct(cameFrom, points, endKey);
    open.delete(currentKey);
    const current = points.get(currentKey)!;
    const neighbors = [
      ...grid.xs.map((x) => ({ x, y: current.y })),
      ...grid.ys.map((y) => ({ x: current.x, y })),
    ].filter((point) => point.x !== current.x || point.y !== current.y);

    for (const neighbor of neighbors) {
      const neighborKey = pointKey(neighbor);
      if (!points.has(neighborKey)) points.set(neighborKey, neighbor);
      if (obstacles.some((rect) => segmentIntersectsRect(current, neighbor, rect))) continue;
      const segmentCost = routeCost([current, neighbor], existingRoutes);
      const nextCost = (costSoFar.get(currentKey) ?? 0) + segmentCost;
      if (nextCost < (costSoFar.get(neighborKey) ?? Number.POSITIVE_INFINITY)) {
        costSoFar.set(neighborKey, nextCost);
        cameFrom.set(neighborKey, currentKey);
        open.add(neighborKey);
      }
    }
  }

  return compactPoints([start, { x: start.x, y: end.y }, end]);
}

export function routeMb3Wire(
  graph: Mb3Graph,
  source: Mb3PortRef,
  target: Mb3PortRef,
  existingRoutes: Mb3Point[][] = [],
): Mb3Point[] {
  const sourcePort = portPoint(graph, source, target);
  const targetPort = portPoint(graph, target, source);
  if (!sourcePort || !targetPort) return [];

  const sourceExit = offsetPoint(sourcePort.point, sourcePort.side);
  const targetExit = offsetPoint(targetPort.point, targetPort.side);
  const excludedIds = new Set([source.id, target.id]);
  const obstacles = boxes(graph)
    .filter((rect) => !excludedIds.has(rect.id))
    .map((rect) => expanded(rect));
  const middle = findGridPath(sourceExit, targetExit, obstacles, existingRoutes);
  return compactPoints([sourcePort.point, sourceExit, ...middle, targetExit, targetPort.point]);
}
