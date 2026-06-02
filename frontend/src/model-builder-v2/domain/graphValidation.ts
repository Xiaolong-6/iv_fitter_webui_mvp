import type { SchematicGraph, ValidationIssue, ValidationResult, PortRef } from "./schematicTypes";
import { DisjointSet } from "./disjointSet";
import { validateExpression } from "./expressionValidation";

function portKey(ref: PortRef): string {
  return ref.kind === "node" ? `node:${ref.id}` : `component:${ref.id}:${ref.port ?? "p"}`;
}

export function validateSchematicGraph(graph: SchematicGraph): ValidationResult {
  const issues: ValidationIssue[] = [];
  const activeComponentIds = new Set<string>();
  const activeWireIds = new Set<string>();
  const danglingComponentIds = new Set<string>();
  const danglingWireIds = new Set<string>();
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const componentIds = new Set(graph.components.map((component) => component.id));
  const dsu = new DisjointSet();
  graph.nodes.forEach((node) => dsu.add(`node:${node.id}`));
  graph.components.forEach((component) => {
    dsu.add(`component:${component.id}:p`);
    dsu.add(`component:${component.id}:n`);
  });
  graph.wires.forEach((wire) => {
    const fromValid = wire.from.kind === "node" ? nodeIds.has(wire.from.id) : componentIds.has(wire.from.id);
    const toValid = wire.to.kind === "node" ? nodeIds.has(wire.to.id) : componentIds.has(wire.to.id);
    if (!fromValid || !toValid) {
      issues.push({ id: `wire-${wire.id}-missing`, severity: "error", title: "Wire endpoint missing", message: `Wire ${wire.id} references a missing node or component.`, targetId: wire.id });
      danglingWireIds.add(wire.id);
      return;
    }
    if (portKey(wire.from) === portKey(wire.to)) {
      issues.push({ id: `wire-${wire.id}-self`, severity: "error", title: "Self-loop wire", message: "A wire cannot connect a port to itself.", targetId: wire.id });
      danglingWireIds.add(wire.id);
      return;
    }
    dsu.union(portKey(wire.from), portKey(wire.to));
  });

  const adjacency = new Map<string, Array<{ other: string; componentId: string }>>();
  const addAdj = (a: string, b: string, componentId: string) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    if (!adjacency.has(b)) adjacency.set(b, []);
    adjacency.get(a)!.push({ other: b, componentId });
    adjacency.get(b)!.push({ other: a, componentId });
  };
  graph.components.forEach((component) => {
    addAdj(dsu.find(`component:${component.id}:p`), dsu.find(`component:${component.id}:n`), component.id);
  });

  const walk = (start: string): Set<string> => {
    const seen = new Set<string>();
    const stack = [start];
    while (stack.length > 0) {
      const current = stack.pop()!;
      if (seen.has(current)) continue;
      seen.add(current);
      (adjacency.get(current) ?? []).forEach((edge) => { if (!seen.has(edge.other)) stack.push(edge.other); });
    }
    return seen;
  };

  const vRoot = dsu.find(`node:${graph.terminals.positive}`);
  const gRoot = dsu.find(`node:${graph.terminals.ground}`);
  const reachableFromV = walk(vRoot);
  const reachableFromG = walk(gRoot);
  const activeElectricalRoots = new Set<string>();

  graph.components.forEach((component) => {
    const validation = validateExpression(component.expression, component.behavior, component.parameters);
    if (!validation.ok) {
      issues.push({ id: `expr-${component.id}`, severity: "error", title: `Invalid expression in ${component.label}`, message: validation.errors.join(" "), targetId: component.id });
    }
    validation.warnings.forEach((warning, index) => issues.push({ id: `expr-warning-${component.id}-${index}`, severity: "warning", title: `Expression warning in ${component.label}`, message: warning, targetId: component.id }));
    const pRoot = dsu.find(`component:${component.id}:p`);
    const nRoot = dsu.find(`component:${component.id}:n`);
    const onVtoGPath = pRoot !== nRoot
      && ((reachableFromV.has(pRoot) && reachableFromG.has(nRoot)) || (reachableFromV.has(nRoot) && reachableFromG.has(pRoot)));
    if (onVtoGPath) {
      activeComponentIds.add(component.id);
      activeElectricalRoots.add(pRoot);
      activeElectricalRoots.add(nRoot);
    } else {
      danglingComponentIds.add(component.id);
    }
  });

  graph.wires.forEach((wire) => {
    if (danglingWireIds.has(wire.id)) return;
    const fromRoot = dsu.find(portKey(wire.from));
    const toRoot = dsu.find(portKey(wire.to));
    if (activeElectricalRoots.has(fromRoot) || activeElectricalRoots.has(toRoot) || fromRoot === vRoot || toRoot === gRoot) {
      activeWireIds.add(wire.id);
    } else {
      danglingWireIds.add(wire.id);
    }
  });

  if (!reachableFromV.has(gRoot)) {
    issues.push({ id: "no-v-gnd-path", severity: "warning", title: "No active V→GND path", message: "Wire components so there is at least one connected path from V to GND. Disconnected items are ignored by the model compiler." });
  }
  if (activeComponentIds.size === 0) {
    issues.push({ id: "no-active-components", severity: "warning", title: "No active component", message: "Add and connect at least one two-terminal component between V and GND." });
  }
  if (danglingComponentIds.size > 0) {
    issues.push({ id: "dangling-components", severity: "info", title: "Disconnected components ignored", message: `${danglingComponentIds.size} component(s) are not on a V→GND path and will not enter fitting.` });
  }
  const hasError = issues.some((issue) => issue.severity === "error");
  return { valid: !hasError && activeComponentIds.size > 0 && reachableFromV.has(gRoot), activeComponentIds, activeWireIds, danglingComponentIds, danglingWireIds, issues };
}
