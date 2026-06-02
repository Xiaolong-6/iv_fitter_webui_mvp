import { describe, expect, it } from "vitest";
import { createEmptySchematicGraph, createSingleDiodeSchematicGraph } from "../domain/initialGraph";
import { validateSchematicGraph } from "../domain/graphValidation";
import { compileSchematicGraph } from "../domain/graphCompile";


describe("Model Builder V2 graph validation", () => {
  it("warns on an empty V/GND graph", () => {
    const result = validateSchematicGraph(createEmptySchematicGraph());
    expect(result.valid).toBe(false);
    expect(result.activeComponentIds.size).toBe(0);
  });

  it("recognizes the starter single-diode graph as active", () => {
    const graph = createSingleDiodeSchematicGraph();
    const result = validateSchematicGraph(graph);
    expect(result.valid).toBe(true);
    expect(result.activeComponentIds).toEqual(new Set(["Rs", "D1", "Rsh"]));
  });

  it("compiles only active components", () => {
    const graph = createSingleDiodeSchematicGraph();
    graph.components.push({ ...graph.components[0], id: "unused", label: "unused", position: { x: 100, y: 100 } });
    const result = compileSchematicGraph(graph);
    expect(result.graphSpec.components.map((component) => component.id)).toEqual(expect.arrayContaining(["Rs", "D1", "Rsh"]));
    expect(result.graphSpec.components.map((component) => component.id)).not.toContain("unused");
  });
});
