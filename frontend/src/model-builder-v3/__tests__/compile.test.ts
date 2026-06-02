import { describe, expect, it } from "vitest";
import { compileMb3Graph } from "../domain/compile";
import type { Mb3Graph } from "../domain/types";
import { MB3_BUILT_IN_PRESETS } from "../domain/presets";
import { createMb3StarterGraph } from "../state/factory";

describe("model-builder-v3 compile contract", () => {
  it("compiles the clear canvas as an empty fitting model", () => {
    const compiled = compileMb3Graph(createMb3StarterGraph());
    expect(compiled.graphSchemaVersion).toBe("schematic_v3");
    expect(compiled.activeComponentIds).toEqual([]);
    expect(compiled.model.core).toEqual([]);
    expect(compiled.model.series).toEqual([]);
    expect(compiled.model.parallel).toEqual([]);
    expect(compiled.model.graph?.components).toEqual([]);
  });

  it("compiles the built-in single diode preset into graph and legacy fitting buckets", () => {
    const graph = MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph;
    const compiled = compileMb3Graph(graph);

    expect(compiled.activeComponentIds).toEqual(expect.arrayContaining(["Rs", "D1", "Rsh"]));
    expect(compiled.model.graph?.schema_version).toBe("schematic_v3");
    expect(compiled.model.graph?.components.map((component) => component.id)).toEqual(
      expect.arrayContaining(["Rs", "D1", "Rsh"]),
    );
    expect(compiled.model.series.map((component) => component.id)).toEqual(["Rs"]);
    expect(compiled.model.core.map((component) => component.id)).toEqual(["D1"]);
    expect(compiled.model.parallel.map((component) => component.id)).toEqual(["Rsh"]);
    expect(compiled.model.core[0].params.I0_A.value).toBe(1e-12);
    expect(compiled.model.series[0].params.Rs_ohm.value).toBe(10);
    expect(compiled.model.parallel[0].params.Rsh_ohm.value).toBe(1e9);
  });

  it("ignores disconnected draft components", () => {
    const graph = structuredClone(
      MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph,
    ) as Mb3Graph;
    graph.components.push({
      id: "draft",
      label: "draft",
      templateKey: "constant_current",
      behavior: "I_of_V",
      expression: "I0",
      sign: 1,
      position: { x: 20, y: 20 },
      parameters: [{ symbol: "I0", value: 1e-3, lower: -1, upper: 1, fit: true, unit: "A" }],
    });

    const compiled = compileMb3Graph(graph);
    expect(compiled.componentIds).toContain("draft");
    expect(compiled.activeComponentIds).not.toContain("draft");
    expect(compiled.model.graph?.components.map((component) => component.id)).not.toContain("draft");
  });

  it("preserves custom expression parameters, bounds, units, and fit flags", () => {
    const graph: Mb3Graph = {
      version: 3,
      terminals: { positive: "V", ground: "GND" },
      nodes: [
        { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
        { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 200 } },
      ],
      components: [
        {
          id: "Icustom",
          label: "Icustom",
          templateKey: "custom",
          behavior: "I_of_V",
          expression: "A*V+B",
          sign: 1,
          position: { x: 0, y: 100 },
          parameters: [
            { symbol: "A", value: 2, lower: 0, upper: 10, fit: true, unit: "A/V" },
            { symbol: "B", value: 1e-9, lower: -1, upper: 1, fit: false, unit: "A" },
          ],
        },
      ],
      wires: [
        { id: "w1", from: { kind: "node", id: "V" }, to: { kind: "component", id: "Icustom", port: "p" } },
        { id: "w2", from: { kind: "component", id: "Icustom", port: "n" }, to: { kind: "node", id: "GND" } },
      ],
    };

    const compiled = compileMb3Graph(graph);
    const component = compiled.model.graph?.components[0];
    expect(component?.metadata?.expression).toBe("A*V+B");
    expect(component?.params.A).toMatchObject({ value: 2, lower: 0, upper: 10, fit: true, unit: "A/V" });
    expect(component?.params.B).toMatchObject({ value: 1e-9, lower: -1, upper: 1, fit: false, unit: "A" });
  });
});
