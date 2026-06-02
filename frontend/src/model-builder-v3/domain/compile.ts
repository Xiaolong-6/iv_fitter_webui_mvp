import type { Mb3CompileResult, Mb3Graph } from "./types";

export function compileMb3Graph(graph: Mb3Graph): Mb3CompileResult {
  return {
    graphSchemaVersion: "schematic_v3",
    componentIds: graph.components.map((component) => component.id),
    wireIds: graph.wires.map((wire) => wire.id),
  };
}
