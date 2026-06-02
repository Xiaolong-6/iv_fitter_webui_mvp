import type { ModelSpec } from "../../model/types";
import type { SchematicComponent, SchematicGraph, SchematicWire } from "./schematicTypes";
import { getSchematicGraph } from "./schematicTypes";
import { createComponentFromPreset } from "./componentCatalog";

export function createEmptySchematicGraph(): SchematicGraph {
  return {
    version: 2,
    nodes: [
      { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 120, y: 260 }, locked: true },
      { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 820, y: 260 }, locked: true },
    ],
    components: [],
    wires: [],
    terminals: { positive: "V", ground: "GND" },
    metadata: { title: "Untitled model", createdBy: "model-builder-v2", updatedAt: new Date().toISOString() },
  };
}

function makeWire(id: string, fromId: string, fromKind: "node" | "component", fromPort: "p" | "n" | undefined, toId: string, toKind: "node" | "component", toPort: "p" | "n" | undefined): SchematicWire {
  return {
    id,
    from: { kind: fromKind, id: fromId, port: fromPort },
    to: { kind: toKind, id: toId, port: toPort },
    waypoints: [],
  };
}

export function createSingleDiodeSchematicGraph(): SchematicGraph {
  const graph = createEmptySchematicGraph();
  const rs = createComponentFromPreset("ohmic_R", 1, { x: 260, y: 260 });
  rs.id = "Rs";
  rs.label = "Rs";
  rs.parameters[0] = { ...rs.parameters[0], symbol: "Rs", id: "Rs", value: 10 };
  const d1 = createComponentFromPreset("shockley_I", 1, { x: 500, y: 210 });
  d1.id = "D1";
  d1.label = "D1";
  const rsh = createComponentFromPreset("ohmic_R", 2, { x: 500, y: 315 });
  rsh.id = "Rsh";
  rsh.label = "Rsh";
  rsh.parameters[0] = { ...rsh.parameters[0], symbol: "Rsh", id: "Rsh", value: 1e9 };
  const components: SchematicComponent[] = [rs, d1, rsh];
  return {
    ...graph,
    nodes: [
      ...graph.nodes,
      { id: "J1", kind: "junction", label: "J1", position: { x: 410, y: 260 } },
      { id: "J2", kind: "junction", label: "J2", position: { x: 685, y: 260 } },
    ],
    components,
    wires: [
      makeWire("w_v_rs", "V", "node", undefined, "Rs", "component", "p"),
      makeWire("w_rs_j1", "Rs", "component", "n", "J1", "node", undefined),
      makeWire("w_j1_d1", "J1", "node", undefined, "D1", "component", "p"),
      makeWire("w_d1_j2", "D1", "component", "n", "J2", "node", undefined),
      makeWire("w_j1_rsh", "J1", "node", undefined, "Rsh", "component", "p"),
      makeWire("w_rsh_j2", "Rsh", "component", "n", "J2", "node", undefined),
      makeWire("w_j2_gnd", "J2", "node", undefined, "GND", "node", undefined),
    ],
    metadata: { ...graph.metadata, title: "Single diode graph-native model", migratedFromLegacy: true },
  };
}

export function graphFromModelOrDefault(model: ModelSpec): SchematicGraph {
  return getSchematicGraph(model) ?? createSingleDiodeSchematicGraph();
}
