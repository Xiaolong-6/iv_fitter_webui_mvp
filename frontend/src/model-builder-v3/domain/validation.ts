import type { Mb3Graph, Mb3PortRef } from "./types";

export type Mb3ConnectivityStatus =
  | { level: "ok"; label: string }
  | { level: "warning"; label: string }
  | { level: "open"; label: string };

function portKey(port: Mb3PortRef): string {
  return port.kind === "component"
    ? `component:${port.id}:${port.port ?? "p"}`
    : `node:${port.id}`;
}

function addEdge(adjacency: Map<string, Set<string>>, a: string, b: string) {
  if (!adjacency.has(a)) adjacency.set(a, new Set());
  if (!adjacency.has(b)) adjacency.set(b, new Set());
  adjacency.get(a)?.add(b);
  adjacency.get(b)?.add(a);
}

function hasPath(adjacency: Map<string, Set<string>>, start: string, target: string): boolean {
  if (start === target) return true;
  const seen = new Set<string>([start]);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    for (const next of adjacency.get(current) ?? []) {
      if (next === target) return true;
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return false;
}

export function evaluateMb3GraphConnectivity(graph: Mb3Graph): Mb3ConnectivityStatus {
  const positive = `node:${graph.terminals.positive}`;
  const ground = `node:${graph.terminals.ground}`;
  const wireOnlyAdjacency = new Map<string, Set<string>>();
  const fullAdjacency = new Map<string, Set<string>>();

  for (const wire of graph.wires) {
    const from = portKey(wire.from);
    const to = portKey(wire.to);
    addEdge(wireOnlyAdjacency, from, to);
    addEdge(fullAdjacency, from, to);
  }

  for (const component of graph.components) {
    addEdge(fullAdjacency, `component:${component.id}:p`, `component:${component.id}:n`);
  }

  if (hasPath(wireOnlyAdjacency, positive, ground)) {
    return { level: "warning", label: "Warning: short circuit" };
  }

  if (hasPath(fullAdjacency, positive, ground)) {
    return { level: "ok", label: "Path OK: V to GND" };
  }

  return { level: "open", label: "Open: no V-GND path" };
}
