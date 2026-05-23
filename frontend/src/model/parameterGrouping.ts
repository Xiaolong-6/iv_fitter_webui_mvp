import type { ComponentSpec, FitResult, Location, ModelSpec, ParameterSpec } from "./types";

export type ParameterFilter = "all" | "fitted" | "fixed" | "changed" | "at_bounds" | "main" | "branches";
export type PlacementGroupId = "main" | "branches";

export interface ParameterRowModel {
  key: string;
  location: Location;
  component: ComponentSpec;
  paramName: string;
  spec: ParameterSpec;
  placementGroup: PlacementGroupId;
  isFitted: boolean;
  isChanged: boolean;
  isAtBounds: boolean;
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

function nearlyEqual(a: number, b: number) {
  const scale = Math.max(Number.EPSILON, Math.abs(a), Math.abs(b));
  return Math.abs(a - b) <= Math.max(Number.EPSILON, scale * 1e-9);
}

function parameterChanged(spec: ParameterSpec, fitted?: { value: number; lower?: number | null; upper?: number | null; fixed: boolean }) {
  if (!fitted) return false;
  const fitFlag = spec.fit ?? true;
  if (!nearlyEqual(spec.value, fitted.value)) return true;
  if ((spec.lower ?? null) !== (fitted.lower ?? null)) return true;
  if ((spec.upper ?? null) !== (fitted.upper ?? null)) return true;
  if (fitFlag === fitted.fixed) return true;
  return false;
}

function parameterAtBounds(spec: ParameterSpec, fitted?: { value: number }) {
  const value = fitted?.value ?? spec.value;
  if (spec.lower !== null && spec.lower !== undefined && nearlyEqual(value, spec.lower)) return true;
  if (spec.upper !== null && spec.upper !== undefined && nearlyEqual(value, spec.upper)) return true;
  return false;
}

export function buildParameterRows(model: ModelSpec, result: FitResult | null): ParameterRowModel[] {
  return (["series", "core", "parallel"] as const).flatMap((location) =>
    model[location].flatMap((component) =>
      Object.entries(component.params).map(([paramName, spec]) => {
        const key = parameterKey(component.id, paramName);
        const fitted = result?.parameters[key];
        return {
          key,
          location,
          component,
          paramName,
          spec,
          placementGroup: placementGroupForLocation(location),
          isFitted: spec.fit ?? true,
          isChanged: parameterChanged(spec, fitted),
          isAtBounds: parameterAtBounds(spec, fitted),
        };
      }),
    ),
  );
}

export function filterParameterRows(rows: ParameterRowModel[], filter: ParameterFilter): ParameterRowModel[] {
  if (filter === "fitted") return rows.filter((row) => row.isFitted);
  if (filter === "fixed") return rows.filter((row) => !row.isFitted);
  if (filter === "changed") return rows.filter((row) => row.isChanged);
  if (filter === "at_bounds") return rows.filter((row) => row.isAtBounds);
  if (filter === "main") return rows.filter((row) => row.placementGroup === "main");
  if (filter === "branches") return rows.filter((row) => row.placementGroup === "branches");
  return rows;
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
