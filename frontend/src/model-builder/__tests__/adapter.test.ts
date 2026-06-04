import { describe, expect, it } from "vitest";
import { createMb3StarterGraph } from "../state/factory";
import { mb3ToReactFlow } from "../canvas/adapter";
import { routeMb3Wire } from "../canvas/routing";
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

describe("model-builder canvas adapter", () => {
  it("maps graph nodes and wires to react-flow elements", () => {
    const graph = createMb3StarterGraph();
    const flow = mb3ToReactFlow(graph);
    expect(flow.nodes.length).toBe(graph.nodes.length + graph.components.length);
    expect(flow.edges.length).toBe(graph.wires.length);
  });

  it("maps component wire endpoints to concrete React Flow handles", () => {
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
        { id: "w-top", from: { kind: "node", id: "V" }, to: { kind: "component", id: "R0", port: "p" } },
      ],
    };
    const flow = mb3ToReactFlow(graph);
    const componentEdge = flow.edges.find((edge) => edge.id === "w-top");

    expect(componentEdge?.sourceHandle).toBe("node");
    expect(componentEdge?.targetHandle).toBe("p-target");
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
    const blockerBox = { x: 100, y: 150, width: 150, height: 54 };

    expect(route.length).toBeGreaterThan(2);
    expect(route.slice(0, -1).some((point, index) =>
      segmentCrossesBox(point, route[index + 1], blockerBox),
    )).toBe(false);
  });

  it("routes junction wires toward the connected side instead of always exiting downward", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 280, y: 20 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 280, y: 420 } },
        { id: "J1", kind: "junction", label: "V1", position: { x: 300, y: 150 } },
      ],
      components: [
        {
          id: "Rsh",
          label: "Rsh",
          templateKey: "resistance",
          behavior: "R_of_V",
          expression: "Rsh",
          sign: 1,
          position: { x: 470, y: 130 },
          parameters: [{ symbol: "Rsh", value: 1e9, lower: 1e3, upper: 1e18, fit: true, unit: "ohm" }],
        },
      ],
      wires: [
        { id: "w-v", from: { kind: "node", id: "V" }, to: { kind: "node", id: "J1" } },
        { id: "w-rsh", from: { kind: "node", id: "J1" }, to: { kind: "component", id: "Rsh", port: "p" } },
        { id: "w-gnd", from: { kind: "component", id: "Rsh", port: "n" }, to: { kind: "node", id: "GND" } },
      ],
    };

    const flow = mb3ToReactFlow(graph, [], ["Rsh"]);
    const route = (flow.edges.find((edge) => edge.id === "w-rsh")?.data as RoutedEdgeData | undefined)?.routePoints ?? [];

    expect(route.length).toBeGreaterThan(2);
    expect(route[1].x).toBeGreaterThan(route[0].x);
    expect(Math.abs(route[1].y - route[0].y)).toBe(0);
  });

  it("places component ports on the nearest useful border for diagonal branches", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 120, y: 20 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 120, y: 420 } },
        { id: "J1", kind: "junction", label: "V1", position: { x: 120, y: 170 } },
        { id: "J0", kind: "junction", label: "0", position: { x: 130, y: 230 } },
      ],
      components: [
        {
          id: "D1",
          label: "D1",
          templateKey: "shockley_diode",
          behavior: "I_of_V",
          expression: "I0*(exp(V/(n*8.617333262e-5*T))-1)",
          sign: 1,
          position: { x: 320, y: 180 },
          parameters: [{ symbol: "I0", value: 1e-12, lower: 1e-30, upper: 1, fit: true, unit: "A" }],
        },
      ],
      wires: [
        { id: "w-in", from: { kind: "node", id: "J1" }, to: { kind: "component", id: "D1", port: "p" } },
        { id: "w-out", from: { kind: "component", id: "D1", port: "n" }, to: { kind: "node", id: "J0" } },
      ],
    };

    const inRoute = routeMb3Wire(graph, { kind: "node", id: "J1" }, { kind: "component", id: "D1", port: "p" });
    const outRoute = routeMb3Wire(graph, { kind: "component", id: "D1", port: "n" }, { kind: "node", id: "J0" });
    const entryPoint = inRoute[inRoute.length - 1];
    const exitPoint = outRoute[0];

    expect(entryPoint).toEqual({ x: 320, y: 207 });
    expect(exitPoint).toEqual({ x: 470, y: 207 });
  });

  it("keeps simple serial routes compact instead of wrapping around the canvas", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 360, y: 40 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 320, y: 520 } },
      ],
      components: [
        {
          id: "R0",
          label: "R0",
          templateKey: "resistance",
          behavior: "R_of_V",
          expression: "R0",
          sign: 1,
          position: { x: 80, y: 250 },
          parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
        },
        {
          id: "D1",
          label: "D1",
          templateKey: "shockley_diode",
          behavior: "I_of_V",
          expression: "I0*(exp(V/(n*8.617333262e-5*T))-1)",
          sign: 1,
          position: { x: 320, y: 300 },
          parameters: [{ symbol: "I0", value: 1e-12, lower: 1e-30, upper: 1, fit: true, unit: "A" }],
        },
      ],
      wires: [
        { id: "w-v-r0", from: { kind: "node", id: "V" }, to: { kind: "component", id: "R0", port: "p" } },
        { id: "w-r0-d1", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "component", id: "D1", port: "p" } },
        { id: "w-d1-gnd", from: { kind: "component", id: "D1", port: "n" }, to: { kind: "node", id: "GND" } },
      ],
    };

    const flow = mb3ToReactFlow(graph, [], ["R0", "D1"]);
    const d1Node = flow.nodes.find((node) => node.id === "D1");
    const d1Sides = d1Node?.data.portSides as { p?: string; n?: string } | undefined;
    const d1GroundRoute = (flow.edges.find((edge) => edge.id === "w-d1-gnd")?.data as RoutedEdgeData | undefined)?.routePoints ?? [];
    const r0D1Route = (flow.edges.find((edge) => edge.id === "w-r0-d1")?.data as RoutedEdgeData | undefined)?.routePoints ?? [];

    expect(d1Sides?.n).toBe("bottom");
    expect(Math.max(...d1GroundRoute.map((point) => point.x))).toBeLessThan(430);
    expect(Math.max(...r0D1Route.map((point) => point.x))).toBeLessThan(430);
  });
});
