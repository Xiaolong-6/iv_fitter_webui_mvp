import type { GraphComponent, GraphNode, GraphSpec, ModelSpec } from "../../model/types";
import type { CompiledGraphResult, PortRef, SchematicGraph } from "./schematicTypes";
import { componentParamsToBackend } from "./schematicTypes";
import { DisjointSet } from "./disjointSet";
import { validateSchematicGraph } from "./graphValidation";

function portKey(ref: PortRef): string {
  return ref.kind === "node" ? `node:${ref.id}` : `component:${ref.id}:${ref.port ?? "p"}`;
}

function backendFunctionType(behavior: string, presetId: string): string {
  if (presetId.includes("shockley")) return "diode";
  if (behavior === "R_of_V") return "custom_resistance";
  if (behavior === "I_of_V") return "custom_current";
  if (behavior === "dV_of_I") return "custom_voltage_drop";
  return "custom_residual";
}

function backendPlacement(behavior: string): GraphComponent["placement"] {
  if (behavior === "dV_of_I") return "series_voltage_drop";
  if (behavior === "R_of_V") return "parallel_current_branch";
  if (behavior === "I_of_V") return "parallel_current_branch";
  return "constraint";
}

function rootLabel(root: string, index: number, graph: SchematicGraph): string {
  if (root === `node:${graph.terminals.positive}`) return "V";
  if (root === `node:${graph.terminals.ground}`) return "GND";
  return `N${index}`;
}

export function compileSchematicGraph(graph: SchematicGraph): CompiledGraphResult {
  const validation = validateSchematicGraph(graph);
  const dsu = new DisjointSet();
  graph.nodes.forEach((node) => dsu.add(`node:${node.id}`));
  graph.components.forEach((component) => {
    dsu.add(`component:${component.id}:p`);
    dsu.add(`component:${component.id}:n`);
  });
  graph.wires.forEach((wire) => dsu.union(portKey(wire.from), portKey(wire.to)));
  const roots = new Map<string, string>();
  function mappedNode(port: PortRef): string {
    const root = dsu.find(portKey(port));
    if (!roots.has(root)) roots.set(root, rootLabel(root, roots.size + 1, graph));
    return roots.get(root)!;
  }
  graph.nodes.forEach((node) => {
    const root = dsu.find(`node:${node.id}`);
    if (!roots.has(root)) roots.set(root, rootLabel(root, roots.size + 1, graph));
  });
  const nodes: GraphNode[] = Array.from(roots.values()).map((id) => ({
    id,
    label: id,
    role: id === "V" ? "terminal" : id === "GND" ? "reference" : "internal",
  }));
  const components: GraphComponent[] = graph.components
    .filter((component) => validation.activeComponentIds.has(component.id))
    .map((component) => ({
      id: component.id,
      function_type: backendFunctionType(component.behavior, component.presetId),
      law_id: component.behavior,
      evaluation_form: component.behavior === "dV_of_I" ? "voltage_drop" : component.behavior === "residual" ? "implicit_relation" : "current_branch",
      placement: backendPlacement(component.behavior),
      node_pos: mappedNode({ kind: "component", id: component.id, port: "p" }),
      node_neg: mappedNode({ kind: "component", id: component.id, port: "n" }),
      polarity: component.sign === 1 ? "forward" : "reverse",
      params: componentParamsToBackend(component.parameters),
      metadata: {
        nickname: component.label,
        behavior: component.behavior === "residual" ? "custom_residual" : component.behavior,
        expression: component.expression,
        presetId: component.presetId,
        presetLabel: component.presetLabel,
        source: "schematic_v2",
      },
    }));
  const graphSpec: GraphSpec = {
    terminals: ["V"],
    reference_node: "GND",
    nodes,
    components,
    assembly_notes: [
      "Generated from Model Builder V2 SchematicGraph.",
      "Only components on an active V-to-GND connected subgraph are included.",
      "React Flow node positions are not solver truth; graph ports and wires are compiled into backend node ids.",
    ],
    schema_version: "schematic_v2",
  };
  (graphSpec as unknown as { schematic: SchematicGraph }).schematic = graph;
  return { graphSpec, validation };
}

export function applySchematicGraphToModel(model: ModelSpec, graph: SchematicGraph): ModelSpec {
  const { graphSpec } = compileSchematicGraph(graph);
  return {
    ...model,
    graph: graphSpec,
  };
}
