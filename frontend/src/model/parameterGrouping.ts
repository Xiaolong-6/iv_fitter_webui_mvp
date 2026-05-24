import type { ComponentSpec, FitResult, Location, ModelSpec, ParameterSpec } from "./types";

export type PlacementGroupId = "main" | "branches";

export interface ParameterRowModel {
  key: string;
  location: Location;
  component: ComponentSpec;
  paramName: string;
  spec: ParameterSpec;
  placementGroup: PlacementGroupId;
  isFitted: boolean;
}

export interface ComponentParameterGroup {
  component: ComponentSpec;
  location: Location;
  placementGroup: PlacementGroupId;
  rows: ParameterRowModel[];
  fittedCount: number;
  totalCount: number;
}

export interface PlacementParameterGroup {
  id: PlacementGroupId;
  groups: ComponentParameterGroup[];
}

export function parameterKey(componentId: string, paramName: string) {
  return `${componentId}.${paramName}`;
}

export function placementGroupForLocation(location: Location): PlacementGroupId {
  return location === "series" ? "main" : "branches";
}

export function buildParameterRows(model: ModelSpec, result: FitResult | null): ParameterRowModel[] {
  return (["series", "core", "parallel"] as const).flatMap((location) =>
    model[location].flatMap((component) =>
      Object.entries(component.params).map(([paramName, spec]) => {
        const key = parameterKey(component.id, paramName);
        return {
          key,
          location,
          component,
          paramName,
          spec,
          placementGroup: placementGroupForLocation(location),
          isFitted: spec.fit ?? true,
        };
      }),
    ),
  );
}

export function groupParameterRows(rows: ParameterRowModel[]): PlacementParameterGroup[] {
  return (["main", "branches"] as const).map((id) => {
    const componentGroups = new Map<string, ComponentParameterGroup>();
    for (const row of rows.filter((item) => item.placementGroup === id)) {
      const existing = componentGroups.get(row.component.id);
      if (existing) {
        existing.rows.push(row);
        existing.fittedCount += row.isFitted ? 1 : 0;
        existing.totalCount += 1;
      } else {
        componentGroups.set(row.component.id, {
          component: row.component,
          location: row.location,
          placementGroup: row.placementGroup,
          rows: [row],
          fittedCount: row.isFitted ? 1 : 0,
          totalCount: 1,
        });
      }
    }
    return { id, groups: [...componentGroups.values()] };
  }).filter((group) => group.groups.length > 0);
}

export function setComponentFitState(model: ModelSpec, location: Location, componentId: string, fit: boolean): ModelSpec {
  return updateComponentParams(model, location, componentId, (spec) => ({ ...spec, fit }));
}

export function seedComponentFromFittedValues(model: ModelSpec, result: FitResult | null, location: Location, componentId: string): ModelSpec {
  if (!result) return model;
  return updateComponentParams(model, location, componentId, (spec, paramName) => {
    const fitted = result.parameters[parameterKey(componentId, paramName)];
    return fitted ? { ...spec, value: fitted.value } : spec;
  });
}

export function seedModelFromFittedValues(model: ModelSpec, result: FitResult | null): ModelSpec {
  if (!result) return model;
  let next = model;
  for (const location of ["series", "core", "parallel"] as const) {
    for (const component of next[location]) {
      next = seedComponentFromFittedValues(next, result, location, component.id);
    }
  }
  return next;
}

export function restoreModelParameterValues(model: ModelSpec, snapshot: ModelSpec | null): ModelSpec {
  if (!snapshot) return model;
  const snapshotValues = new Map<string, number>();
  for (const location of ["series", "core", "parallel"] as const) {
    for (const component of snapshot[location]) {
      for (const [paramName, spec] of Object.entries(component.params)) {
        snapshotValues.set(parameterKey(component.id, paramName), spec.value);
      }
    }
  }
  let next = model;
  for (const location of ["series", "core", "parallel"] as const) {
    for (const component of next[location]) {
      next = updateComponentParams(next, location, component.id, (spec, paramName) => {
        const value = snapshotValues.get(parameterKey(component.id, paramName));
        return value === undefined ? spec : { ...spec, value };
      });
    }
  }
  return next;
}

export function replaceComponentParams(model: ModelSpec, location: Location, componentId: string, params: Record<string, ParameterSpec>): ModelSpec {
  const copy = structuredClone(model) as ModelSpec;
  copy[location] = copy[location].map((component) => component.id === componentId ? { ...component, params } : component);
  return copy;
}

function updateComponentParams(
  model: ModelSpec,
  location: Location,
  componentId: string,
  updater: (spec: ParameterSpec, paramName: string) => ParameterSpec,
): ModelSpec {
  const copy = structuredClone(model) as ModelSpec;
  copy[location] = copy[location].map((component) => {
    if (component.id !== componentId) return component;
    const params = Object.fromEntries(Object.entries(component.params).map(([name, spec]) => [name, updater(spec, name)]));
    return { ...component, params };
  });
  return copy;
}
