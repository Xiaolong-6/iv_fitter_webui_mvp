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

function canonicalFunctionType(functionType: string) {
  return functionType === "photocurrent_voltage_dependent" || functionType === "voltage_dependent_photocurrent"
    ? "bias_dependent_current"
    : functionType;
}

function canonicalLawId(comp: ComponentSpec) {
  const law = comp.law_id ?? comp.function_type;
  return law === "photocurrent_voltage_dependent" || law === "voltage_dependent_photocurrent"
    ? "bias_dependent_current"
    : law;
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

export function duplicateBaseKey(comp: ComponentSpec) {
  const polarity = comp.polarity ?? "none";
  return [canonicalLawId(comp) || canonicalFunctionType(comp.function_type), comp.evaluation_form ?? "auto", comp.placement ?? "auto", polarity].join("|");
}

export function componentRole(comp: ComponentSpec) {
  const role = comp.metadata?.role;
  return typeof role === "string" && role.trim() ? role.trim() : "";
}

export function duplicateKey(comp: ComponentSpec) {
  const base = duplicateBaseKey(comp);
  const role = componentRole(comp);
  return comp.function_type === "diode" && role ? `${base}|role:${role}` : base;
}

export function isRoleAwareDiode(comp: ComponentSpec) {
  return comp.function_type === "diode" && componentRole(comp).length > 0;
}

export function isDuplicateBlocked(model: ModelSpec, comp: ComponentSpec) {
  if (isRoleAwareDiode(comp)) {
    const key = duplicateKey(comp);
    return allComponents(model).some((existing) => isRoleAwareDiode(existing) && duplicateKey(existing) === key);
  }
  const key = duplicateBaseKey(comp);
  return allComponents(model).some((existing) => duplicateBaseKey(existing) === key);
}

export function canAddComponent(model: ModelSpec, comp: ComponentSpec) {
  if (isDuplicateBlocked(model, comp)) return { ok: false, reason: "duplicate" as const };
  return { ok: true, reason: null };
}

export function allowedPolarities(def?: FunctionDefinition) {
  return def?.allowed_polarities ?? [];
}
