import { describe, expect, it } from "vitest";
import { createMb3StarterGraph } from "../state/factory";
import { mb3ToReactFlow } from "../canvas/adapter";

describe("model-builder-v3 canvas adapter", () => {
  it("maps graph nodes and wires to react-flow elements", () => {
    const graph = createMb3StarterGraph();
    const flow = mb3ToReactFlow(graph);
    expect(flow.nodes.length).toBe(graph.nodes.length + graph.components.length);
    expect(flow.edges.length).toBe(graph.wires.length);
  });
});
