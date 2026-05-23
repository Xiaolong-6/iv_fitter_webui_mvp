import type { ComponentSpec, FunctionDefinition, ModelSpec } from "../model/types";

export type ModelLocation = "core" | "series" | "parallel";
export type BuilderBucket = "main" | "branches";

export const builderBuckets: BuilderBucket[] = ["main", "branches"];
export const bucketLocations: Record<BuilderBucket, ModelLocation[]> = {
  main: ["series"],
  branches: ["core", "parallel"],
};

export function bucketForComponent(comp: ComponentSpec): BuilderBucket {
  return comp.location === "series" || comp.evaluation_form === "voltage_drop" || comp.placement === "series_voltage_drop"
    ? "main"
    : "branches";
}

export function nickname(comp: ComponentSpec) {
  return String(comp.metadata?.nickname ?? comp.id);
}

export function userDefinitions(registry: FunctionDefinition[]) {
  const seen = new Set<string>();
  return registry.filter((definition) => {
    if (definition.function_type === "shunt") return false;
    if (definition.law_id === "ohmic" && seen.has("ohmic")) return false;
    if (definition.law_id === "ohmic") seen.add("ohmic");
    return true;
  });
}

export function definitionsForBucket(registry: FunctionDefinition[], bucket: BuilderBucket) {
  return userDefinitions(registry).filter((definition) => {
    if (bucket === "main") {
      return definition.allowed_placements.includes("series_voltage_drop")
        || definition.allowed_placements.includes("series_conductance_modifier")
        || definition.available_forms.includes("voltage_drop")
        || definition.available_forms.includes("conductance_modifier");
    }
    return definition.allowed_placements.includes("parallel_current_branch")
      || definition.allowed_placements.includes("junction_current_branch")
      || definition.available_forms.includes("current_branch");
  });
}

export function defaultLocationForBucket(bucket: BuilderBucket, def: FunctionDefinition, model: ModelSpec): ModelLocation {
  if (bucket === "main") return "series";
  if (def.function_type === "diode") return "core";
  if (def.available_forms.includes("current_branch")) return "parallel";
  if (!model.core.length) return "core";
  return "parallel";
}

export function allComponents(model: ModelSpec) {
  return [...model.core, ...model.series, ...model.parallel];
}

export function duplicateKey(comp: ComponentSpec) {
  return [comp.law_id ?? comp.function_type, comp.evaluation_form ?? "auto", comp.placement ?? "auto", comp.polarity ?? "none"].join("|");
}

export function isDuplicateBlocked(model: ModelSpec, comp: ComponentSpec) {
  const key = duplicateKey(comp);
  return allComponents(model).some((existing) => duplicateKey(existing) === key);
}

export function isSingleTraceEquivalentMainPathBlocked(model: ModelSpec, comp: ComponentSpec) {
  const mainTerms = model.series;
  const isOhmicDrop = (c: ComponentSpec) => c.law_id === "ohmic" && (c.evaluation_form === "voltage_drop" || c.placement === "series_voltage_drop");
  const isPhotoEffectiveDrop = (c: ComponentSpec) => c.function_type === "photo_modulated_main_path";
  return (isPhotoEffectiveDrop(comp) && mainTerms.some(isOhmicDrop)) || (isOhmicDrop(comp) && mainTerms.some(isPhotoEffectiveDrop));
}

export function canAddComponent(model: ModelSpec, comp: ComponentSpec) {
  if (isDuplicateBlocked(model, comp)) return { ok: false, reason: "duplicate" as const };
  if (isSingleTraceEquivalentMainPathBlocked(model, comp)) return { ok: false, reason: "single_trace_equivalent" as const };
  return { ok: true, reason: null };
}

export function allowedPolarities(def?: FunctionDefinition) {
  return def?.allowed_polarities ?? [];
}
