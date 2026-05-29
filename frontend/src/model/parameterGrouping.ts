import type { ComponentSpec, FitResult, Location, ModelSpec, ParameterSpec } from "./types";

export type PlacementGroupId = "main" | "junction" | "branches" | "modifiers";
export type ParameterTableFilter = "all" | "free" | "fixed" | "near_bound" | "weak";

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
  fittedResultCount: number;
  nearBoundCount: number;
  weakCount: number;
}

export interface PlacementParameterGroup {
  id: PlacementGroupId;
  groups: ComponentParameterGroup[];
}

export type ParameterFilterCounts = Record<ParameterTableFilter, number> & { invalid: number };

export function parameterKey(componentId: string, paramName: string) {
  return `${componentId}.${paramName}`;
}

function placementText(component: ComponentSpec) {
  return `${component.placement ?? ""} ${component.evaluation_form ?? ""} ${component.function_type ?? ""}`.toLowerCase();
}

export function placementGroupForComponent(component: ComponentSpec): PlacementGroupId {
  const text = placementText(component);
  if (component.location === "series") return text.includes("modifier") ? "modifiers" : "main";
  if (component.location === "core") return text.includes("modifier") ? "modifiers" : "junction";
  return text.includes("modifier") ? "modifiers" : "branches";
}

export function placementGroupForLocation(location: Location): PlacementGroupId {
  if (location === "series") return "main";
  if (location === "core") return "junction";
  return "branches";
}

export function placementGroupTitle(id: PlacementGroupId, language: "en" | "zh" = "en") {
  const zh = language === "zh";
  if (id === "main") return zh ? "主路 / 串联压降" : "Main path / series voltage drops";
  if (id === "junction") return zh ? "结区核心支路" : "Junction core branches";
  if (id === "branches") return zh ? "并联 / 漏电支路" : "Parallel and leakage branches";
  return zh ? "修饰器 / 辅助项" : "Modifiers and auxiliary terms";
}

export function componentLawFormPlacement(component: ComponentSpec) {
  return {
    law: component.law_id ?? component.function_type ?? "unknown",
    form: component.evaluation_form ?? "not declared",
    placement: component.placement ?? component.location,
  };
}

export function componentDisplayTag(component: ComponentSpec) {
  const name = String(component.metadata?.nickname ?? component.id);
  const { law, placement } = componentLawFormPlacement(component);
  return `${name} · ${law} · ${placement}`;
}

export function buildParameterRows(model: ModelSpec, result: FitResult | null): ParameterRowModel[] {
  void result;
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
          placementGroup: placementGroupForComponent(component),
          isFitted: spec.fit ?? true,
        };
      }),
    ),
  );
}

export function parameterRowStatus(row: ParameterRowModel, result: FitResult | null): ParameterTableFilter | "invalid" {
  const fitted = result?.parameters[row.key];
  if (!row.isFitted || fitted?.fixed) return "fixed";
  if (!fitted) return "free";
  const value = fitted.value;
  if (!Number.isFinite(value)) return "invalid";
  const lower = fitted.lower;
  const upper = fitted.upper;
  const span = lower != null && upper != null && Number.isFinite(lower) && Number.isFinite(upper)
    ? Math.max(Math.abs(upper - lower), 1)
    : Math.max(Math.abs(value), 1);
  const tolerance = span * 1e-6;
  const nearLower = lower !== null && lower !== undefined && Math.abs(value - lower) <= tolerance;
  const nearUpper = upper !== null && upper !== undefined && Math.abs(value - upper) <= tolerance;
  if (nearLower || nearUpper) return "near_bound";
  if (fitted.stderr !== null && fitted.stderr !== undefined && Number.isFinite(fitted.stderr) && value !== 0 && Math.abs(fitted.stderr / value) > 1) return "weak";
  return "free";
}

export function countParameterFilters(rows: ParameterRowModel[], result: FitResult | null): ParameterFilterCounts {
  const counts: ParameterFilterCounts = { all: rows.length, free: 0, fixed: 0, near_bound: 0, weak: 0, invalid: 0 };
  for (const row of rows) {
    const status = parameterRowStatus(row, result);
    counts[status] += 1;
  }
  return counts;
}

export function filterParameterRows(rows: ParameterRowModel[], result: FitResult | null, filter: ParameterTableFilter): ParameterRowModel[] {
  if (filter === "all") return rows;
  return rows.filter((row) => parameterRowStatus(row, result) === filter);
}

export function groupParameterRows(rows: ParameterRowModel[], result: FitResult | null = null): PlacementParameterGroup[] {
  return (["main", "junction", "branches", "modifiers"] as const).map((id) => {
    const componentGroups = new Map<string, ComponentParameterGroup>();
    for (const row of rows.filter((item) => item.placementGroup === id)) {
      const status = parameterRowStatus(row, result);
      const existing = componentGroups.get(row.component.id);
      if (existing) {
        existing.rows.push(row);
        existing.fittedCount += row.isFitted ? 1 : 0;
        existing.totalCount += 1;
        existing.fittedResultCount += result?.parameters[row.key] ? 1 : 0;
        existing.nearBoundCount += status === "near_bound" ? 1 : 0;
        existing.weakCount += status === "weak" ? 1 : 0;
      } else {
        componentGroups.set(row.component.id, {
          component: row.component,
          location: row.location,
          placementGroup: row.placementGroup,
          rows: [row],
          fittedCount: row.isFitted ? 1 : 0,
          totalCount: 1,
          fittedResultCount: result?.parameters[row.key] ? 1 : 0,
          nearBoundCount: status === "near_bound" ? 1 : 0,
          weakCount: status === "weak" ? 1 : 0,
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
  const copy = structuredClone(model) as ModelSpec;
  copy[location] = copy[location].map((component) => {
    if (component.id !== componentId) return component;
    let changed = false;
    const params = Object.fromEntries(Object.entries(component.params).map(([paramName, spec]) => {
      const fitted = result.parameters[parameterKey(componentId, paramName)];
      if (!fitted || !Number.isFinite(fitted.value)) return [paramName, spec];
      changed = true;
      return [paramName, { ...spec, value: fitted.value }];
    }));
    if (!changed) return component;
    const metadata = { ...(component.metadata ?? {}) };
    const existing = (metadata.parameter_sources as Record<string, unknown> | undefined) ?? {};
    metadata.parameter_sources = Object.fromEntries(Object.entries(component.params).map(([paramName]) => {
      const fitted = result.parameters[parameterKey(componentId, paramName)];
      const previous = (existing[paramName] as object | undefined) ?? {};
      return [paramName, fitted ? { ...previous, initial: "fit_derived_initial" } : previous];
    }));
    return { ...component, params, metadata };
  });
  return copy;
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

export function seedModelFromGroundTruthParameters(model: ModelSpec, groundTruth: Record<string, unknown>): ModelSpec {
  let next = model;
  for (const location of ["series", "core", "parallel"] as const) {
    for (const component of next[location]) {
      next = updateComponentParams(next, location, component.id, (spec, paramName) => {
        const raw = groundTruth[parameterKey(component.id, paramName)];
        const value = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isFinite(value)) return spec;
        return { ...spec, value };
      });
      next[location] = next[location].map((item) => {
        if (item.id !== component.id) return item;
        const metadata = { ...(item.metadata ?? {}) };
        const existing = (metadata.parameter_sources as Record<string, Record<string, unknown>> | undefined) ?? {};
        metadata.parameter_sources = Object.fromEntries(Object.entries(item.params).map(([paramName]) => {
          const key = parameterKey(item.id, paramName);
          const previous = existing[paramName] ?? {};
          return [paramName, groundTruth[key] !== undefined ? { ...previous, initial: "synthetic_ground_truth" } : previous];
        }));
        return { ...item, metadata };
      });
    }
  }
  return next;
}

export function countGroundTruthMatches(model: ModelSpec, groundTruth: Record<string, unknown>): number {
  let count = 0;
  for (const location of ["series", "core", "parallel"] as const) {
    for (const component of model[location]) {
      for (const paramName of Object.keys(component.params)) {
        const value = groundTruth[parameterKey(component.id, paramName)];
        if (value !== undefined && Number.isFinite(typeof value === "number" ? value : Number(value))) count += 1;
      }
    }
  }
  return count;
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
