import { describe, expect, it } from "vitest";
import { createEmptySchematicGraph, createSingleDiodeSchematicGraph } from "../domain/initialGraph";
import { compileSchematicGraph, applySchematicGraphToModel } from "../domain/graphCompile";
import { createInitialModel } from "../../model/defaults";

describe("Model Builder V2 graph compile", () => {
  it("compiles the starter schematic as schematic_v2 GraphSpec and preserves the source schematic", () => {
    const graph = createSingleDiodeSchematicGraph();
    const result = compileSchematicGraph(graph);

    expect(result.graphSpec.schema_version).toBe("schematic_v2");
    expect(result.graphSpec.terminals).toEqual(["V"]);
    expect(result.graphSpec.reference_node).toBe("GND");
    expect(result.graphSpec.components.map((component) => component.id).sort()).toEqual(["D1", "Rs", "Rsh"]);
    expect((result.graphSpec as unknown as { schematic?: unknown }).schematic).toBe(graph);
  });

  it("maps R(V), I(V), and custom metadata without changing the user expression", () => {
    const graph = createSingleDiodeSchematicGraph();
    const d1 = graph.components.find((component) => component.id === "D1");
    expect(d1).toBeTruthy();
    if (!d1) return;
    d1.expression = "Is * (exp(V / (n * Vt)) - 1)";

    const result = compileSchematicGraph(graph);
    const diode = result.graphSpec.components.find((component) => component.id === "D1");
    const resistor = result.graphSpec.components.find((component) => component.id === "Rs");

    expect(diode?.function_type).toBe("diode");
    expect(diode?.metadata?.expression).toBe("Is * (exp(V / (n * Vt)) - 1)");
    expect(resistor?.function_type).toBe("custom_resistance");
    expect(resistor?.metadata?.behavior).toBe("R_of_V");
  });

  it("keeps an empty schematic as a draft graph with no active components", () => {
    const graph = createEmptySchematicGraph();
    const result = compileSchematicGraph(graph);

    expect(result.validation.valid).toBe(false);
    expect(result.graphSpec.components).toHaveLength(0);
    expect(result.graphSpec.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(["V", "GND"]));
  });

  it("applies a compiled schematic to the frontend ModelSpec graph field", () => {
    const graph = createSingleDiodeSchematicGraph();
    const model = createInitialModel("test-version");
    const next = applySchematicGraphToModel(model, graph);

    expect(next.graph?.schema_version).toBe("schematic_v2");
    expect((next.graph as unknown as { schematic?: unknown }).schematic).toBe(graph);
    expect(next.core).toBe(model.core);
    expect(next.series).toBe(model.series);
    expect(next.parallel).toBe(model.parallel);
  });
});
