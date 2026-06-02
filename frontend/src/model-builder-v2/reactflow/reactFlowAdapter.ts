import type { Edge, Node } from "@xyflow/react";
import type { SchematicGraph, ValidationResult } from "../domain/schematicTypes";

export function schematicToReactFlow(graph: SchematicGraph, validation: ValidationResult, onDeleteWire: (wireId: string) => void): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    ...graph.nodes.map((node): Node => ({
      id: node.id,
      type: node.kind === "terminal" ? "terminal" : "junction",
      position: node.position,
      draggable: !node.locked,
      selectable: node.kind !== "terminal",
      data: { label: node.label, role: node.role, active: true },
    })),
    ...graph.components.map((component): Node => ({
      id: component.id,
      type: "component",
      position: component.position,
      data: {
        componentId: component.id,
        label: component.label,
        behavior: component.behavior,
        presetLabel: component.presetLabel,
        active: validation.activeComponentIds.has(component.id),
      },
    })),
  ];
  const edges: Edge[] = graph.wires.map((wire): Edge => ({
    id: wire.id,
    source: wire.from.id,
    sourceHandle: wire.from.kind === "component" ? wire.from.port : "node",
    target: wire.to.id,
    targetHandle: wire.to.kind === "component" ? wire.to.port : "node",
    type: "orthogonalWire",
    data: {
      active: validation.activeWireIds.has(wire.id),
      onDelete: onDeleteWire,
    },
    selectable: true,
  }));
  return { nodes, edges };
}
