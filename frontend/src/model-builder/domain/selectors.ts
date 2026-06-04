import type { Mb3ComponentTemplate } from "./templates";
import type { Mb3Component, Mb3Graph } from "./types";

export function findMb3Component(graph: Mb3Graph, componentId: string | null): Mb3Component | null {
  if (!componentId) return null;
  return graph.components.find((component) => component.id === componentId) ?? null;
}

export function findFirstComponentForTemplate(
  graph: Mb3Graph,
  template: Mb3ComponentTemplate,
): Mb3Component | null {
  return graph.components.find((component) => component.templateKey === template.key) ?? null;
}

export function countComponentsByTemplate(
  graph: Mb3Graph,
  templates: Mb3ComponentTemplate[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const template of templates) map.set(template.key, 0);
  for (const component of graph.components) {
    const key = component.templateKey;
    if (!key || !map.has(key)) continue;
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return map;
}

