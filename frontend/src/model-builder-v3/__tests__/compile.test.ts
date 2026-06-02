import { describe, expect, it } from "vitest";
import { compileMb3Graph } from "../domain/compile";
import { createMb3StarterGraph } from "../state/factory";

describe("model-builder-v3 compile contract", () => {
  it("returns stable schematic_v3 contract", () => {
    const graph = createMb3StarterGraph();
    const compiled = compileMb3Graph(graph);
    expect(compiled.graphSchemaVersion).toBe("schematic_v3");
    expect(compiled.componentIds).toEqual(expect.arrayContaining(["Rs", "D1"]));
    expect(compiled.wireIds.length).toBeGreaterThan(0);
  });
});
