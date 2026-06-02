import type { ComponentBehavior, ComponentParameter, PortRef, SchematicComponent, SchematicGraph, SchematicWire, XYPosition } from "./schematicTypes";
import { createComponentFromPreset, getPreset } from "./componentCatalog";

function touch(graph: SchematicGraph): SchematicGraph {
  return { ...graph, metadata: { ...graph.metadata, updatedAt: new Date().toISOString() } };
}

function nextIndex(graph: SchematicGraph, prefix: string): number {
  return graph.components.filter((component) => component.label.startsWith(prefix)).length + 1;
}

export function addComponentFromPreset(graph: SchematicGraph, presetId: string, position: XYPosition): { graph: SchematicGraph; componentId: string } {
  const preset = getPreset(presetId);
  const prefix = preset.behavior === "I_of_V" ? "I" : preset.behavior === "dV_of_I" ? "Vd" : preset.behavior === "residual" ? "F" : "R";
  const component = createComponentFromPreset(presetId, nextIndex(graph, prefix), position);
  const next = touch({ ...graph, components: [...graph.components, component] });
  return { graph: next, componentId: component.id };
}

export function moveNode(graph: SchematicGraph, id: string, position: XYPosition): SchematicGraph {
  if (graph.nodes.some((node) => node.id === id)) {
    return touch({ ...graph, nodes: graph.nodes.map((node) => node.id === id ? { ...node, position } : node) });
  }
  return touch({ ...graph, components: graph.components.map((component) => component.id === id ? { ...component, position } : component) });
}

export function connectPorts(graph: SchematicGraph, from: PortRef, to: PortRef): SchematicGraph {
  const exists = graph.wires.some((wire) => JSON.stringify(wire.from) === JSON.stringify(from) && JSON.stringify(wire.to) === JSON.stringify(to));
  if (exists) return graph;
  const wire: SchematicWire = { id: `w_${Date.now()}_${Math.round(Math.random() * 1e6)}`, from, to, waypoints: [] };
  return touch({ ...graph, wires: [...graph.wires, wire] });
}

export function deleteWire(graph: SchematicGraph, wireId: string): SchematicGraph {
  return touch({ ...graph, wires: graph.wires.filter((wire) => wire.id !== wireId) });
}

export function deleteComponent(graph: SchematicGraph, componentId: string): SchematicGraph {
  return touch({
    ...graph,
    components: graph.components.filter((component) => component.id !== componentId),
    wires: graph.wires.filter((wire) => wire.from.id !== componentId && wire.to.id !== componentId),
  });
}

export function duplicateComponent(graph: SchematicGraph, componentId: string): { graph: SchematicGraph; componentId: string | null } {
  const component = graph.components.find((item) => item.id === componentId);
  if (!component) return { graph, componentId: null };
  const clone: SchematicComponent = {
    ...component,
    id: `c_${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    label: `${component.label}_copy`,
    position: { x: component.position.x + 28, y: component.position.y + 28 },
    parameters: component.parameters.map((parameter) => ({ ...parameter })),
  };
  return { graph: touch({ ...graph, components: [...graph.components, clone] }), componentId: clone.id };
}

export function updateComponent(graph: SchematicGraph, componentId: string, patch: Partial<SchematicComponent>): SchematicGraph {
  return touch({
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? { ...component, ...patch } : component),
  });
}

export function updateComponentPreset(graph: SchematicGraph, componentId: string, presetId: string): SchematicGraph {
  const preset = getPreset(presetId);
  return touch({
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? {
      ...component,
      behavior: preset.behavior,
      presetId: preset.id,
      presetLabel: preset.label,
      expression: preset.expression,
      parameters: preset.parameters.map((parameter) => ({ ...parameter })),
      sign: preset.sign ?? component.sign,
    } : component),
  });
}

export function updateParameter(graph: SchematicGraph, componentId: string, parameterId: string, patch: Partial<ComponentParameter>): SchematicGraph {
  return touch({
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? {
      ...component,
      parameters: component.parameters.map((parameter) => parameter.id === parameterId ? { ...parameter, ...patch } : parameter),
    } : component),
  });
}

export function addParameter(graph: SchematicGraph, componentId: string): SchematicGraph {
  return touch({
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? {
      ...component,
      parameters: [...component.parameters, { id: `p_${Date.now()}`, symbol: `P${component.parameters.length + 1}`, value: 1, lower: null, upper: null, fit: true, unit: null }],
    } : component),
  });
}

export function removeParameter(graph: SchematicGraph, componentId: string, parameterId: string): SchematicGraph {
  return touch({
    ...graph,
    components: graph.components.map((component) => component.id === componentId ? {
      ...component,
      parameters: component.parameters.filter((parameter) => parameter.id !== parameterId),
    } : component),
  });
}

export function setComponentBehavior(graph: SchematicGraph, componentId: string, behavior: ComponentBehavior): SchematicGraph {
  return updateComponent(graph, componentId, { behavior });
}
