import { describe, expect, it } from "vitest";
import { createMb3StarterGraph } from "../state/factory";
import { mb3ToReactFlow } from "../canvas/adapter";
import type { Mb3Graph } from "../domain/types";

type RoutedEdgeData = {
  routePoints?: Array<{ x: number; y: number }>;
};

function segmentCrossesBox(
  a: { x: number; y: number },
  b: { x: number; y: number },
  box: { x: number; y: number; width: number; height: number },
): boolean {
  if (a.x === b.x) {
    return a.x > box.x && a.x < box.x + box.width
      && Math.max(a.y, b.y) > box.y
      && Math.min(a.y, b.y) < box.y + box.height;
  }
  if (a.y === b.y) {
    return a.y > box.y && a.y < box.y + box.height
      && Math.max(a.x, b.x) > box.x
      && Math.min(a.x, b.x) < box.x + box.width;
  }
  return false;
}

describe("model-builder-v3 canvas adapter", () => {
  it("maps graph nodes and wires to react-flow elements", () => {
    const graph = createMb3StarterGraph();
    const flow = mb3ToReactFlow(graph);
    expect(flow.nodes.length).toBe(graph.nodes.length + graph.components.length);
    expect(flow.edges.length).toBe(graph.wires.length);
  });

  it("keeps half-connected wires visible as inactive edges", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 240 } },
      ],
      components: [
        {
          id: "R0",
          label: "R0",
          templateKey: "resistance",
          behavior: "R_of_V",
          expression: "R0",
          sign: 1,
          position: { x: 80, y: 100 },
          parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
        },
      ],
      wires: [
        { id: "w-bottom", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "node", id: "GND" } },
      ],
    };

    const flow = mb3ToReactFlow(graph, [], []);

    expect(flow.edges.map((edge) => edge.id)).toEqual(["w-bottom"]);
    expect(flow.edges[0].style).toMatchObject({ strokeDasharray: "7 6" });
    expect(flow.edges[0].markerEnd).toBeUndefined();
  });

  it("routes wires around component obstacles instead of through them", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 100, y: 20 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 100, y: 400 } },
      ],
      components: [
        {
          id: "R0",
          label: "R0",
          templateKey: "resistance",
          behavior: "R_of_V",
          expression: "R0",
          sign: 1,
          position: { x: 100, y: 260 },
          parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
        },
        {
          id: "blocker",
          label: "blocker",
          templateKey: "resistance",
          behavior: "R_of_V",
          expression: "Rb",
          sign: 1,
          position: { x: 100, y: 150 },
          parameters: [{ symbol: "Rb", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
        },
      ],
      wires: [
        { id: "w-route", from: { kind: "node", id: "V" }, to: { kind: "component", id: "R0", port: "p" } },
        { id: "w-ground", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "node", id: "GND" } },
      ],
    };

    const flow = mb3ToReactFlow(graph, [], ["R0"]);
    const route = (flow.edges.find((edge) => edge.id === "w-route")?.data as RoutedEdgeData | undefined)?.routePoints ?? [];
    const blockerBox = { x: 100, y: 150, width: 190, height: 54 };

    expect(route.length).toBeGreaterThan(2);
    expect(route.slice(0, -1).some((point, index) =>
      segmentCrossesBox(point, route[index + 1], blockerBox),
    )).toBe(false);
  });
});
