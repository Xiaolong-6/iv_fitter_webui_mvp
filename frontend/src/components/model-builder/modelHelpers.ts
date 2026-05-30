import type { ComponentSpec, FunctionDefinition, Location, ModelSpec, ParameterSpec, Polarity } from "../../model/types";
import type { Language } from "../../model/i18n";
import { t } from "../../model/i18n";
import { createInitialModel } from "../../model/defaults";
import { formatValueWithUnit } from "../../model/format";
import { localizedFunctionLabel } from "../../content/localizedText";
import { componentPhysicalRole } from "../../model/modelDisplaySemantics";
import { buildPendingComponent } from "../../model-builder/mutations";
import {
  allowedPolarities,
  bucketForComponent,
  definitionsForBucket as bucketDefinitions,
  isDuplicateBlocked,
  nickname,
  type BuilderBucket,
  type ModelLocation,
} from "../../model-builder/rules";
import { updateComponent } from "../../model/utils";
import type { BuilderPreset, ComponentRef } from "./types";

export const BUILDER_PRESET_STORAGE_KEY = "ivfitter.builderCustomPresets.v1";

const FUNCTION_TYPE_ALIAS_MAP: Record<string, string> = {
  photocurrent_voltage_dependent: "bias_dependent_current",
  voltage_dependent_photocurrent: "bias_dependent_current",
};

export function cloneModelForPreset(model: ModelSpec): ModelSpec {
  if (typeof structuredClone === "function") return structuredClone(model) as ModelSpec;
  return JSON.parse(JSON.stringify(model)) as ModelSpec;
}

export function makeSingleDiodePreset(model: ModelSpec): ModelSpec {
  return createInitialModel(String(model.version ?? "1.8.18"));
}

export function makeDoubleDiodePreset(model: ModelSpec): ModelSpec {
  const base = makeSingleDiodePreset(model);
  const primary = base.core.find((comp) => comp.function_type === "diode");
  if (!primary) return base;
  const d2 = cloneModelForPreset({ ...base, series: [], core: [primary], parallel: [] }).core[0];
  return {
    ...base,
    parallel: [
      ...base.parallel,
      {
        ...d2,
        id: "D2",
        location: "parallel",
        placement: "parallel_current_branch",
        params: Object.fromEntries(
          Object.entries(d2.params).map(([key, param]) => [
            key,
            {
              ...param,
              value: key === "I0_A" ? 1e-14 : param.value,
              label: key === "I0_A" ? "I02" : param.label,
            },
          ]),
        ) as ComponentSpec["params"],
        metadata: { ...(d2.metadata ?? {}), nickname: "D2", role: "secondary" },
      },
    ],
  };
}

export function readBuilderPresets(): BuilderPreset[] {
  try {
    const raw = window.localStorage.getItem(BUILDER_PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuilderPreset[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string" && item.model) : [];
  } catch {
    return [];
  }
}

export function writeBuilderPresets(presets: BuilderPreset[]) {
  window.localStorage.setItem(BUILDER_PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function componentLawLabel(comp: ComponentSpec, language: Language) {
  if (comp.law_id === "ohmic") return language === "zh" ? "欧姆定律" : "Ohmic law";
  if (comp.function_type === "series_power_law_drop") return language === "zh" ? "Softplus 压降" : "Softplus voltage drop";
  return localizedFunctionLabel(comp.function_type, comp.law_id ?? comp.function_type, language);
}

export function componentDisplayName(comp: ComponentSpec, language: Language) {
  return componentLawLabel(comp, language);
}

export function polarityLabel(language: Language, p: string) {
  if (p === "forward") return t(language, "forwardPolarity");
  if (p === "reverse") return t(language, "reversePolarity");
  if (p === "symmetric") return t(language, "bothPolarity");
  return p;
}

export function functionOptionLabel(definition: FunctionDefinition, language: Language, bucket?: BuilderBucket) {
  const advanced = new Set([
    "series_diode_barrier",
    "softplus_rs_modifier",
    "series_power_law_drop",
    "custom",
    "power_law",
    "soft_breakdown",
    "bias_dependent_current",
    "photocurrent_voltage_dependent",
    "voltage_dependent_photocurrent",
  ]);
  const prefix = advanced.has(definition.function_type)
    ? (language === "zh" ? "高级 · " : "Advanced · ")
    : (language === "zh" ? "基础 · " : "Basic · ");
  if (definition.function_type === "series_diode_barrier") return prefix + (language === "zh" ? "类二极管串联势垒压降" : "Diode-like series barrier drop");
  if (definition.function_type === "softplus_rs_modifier") return prefix + (language === "zh" ? "偏压相关串联电导调制" : "Bias-dependent series conductance modifier");
  if (definition.function_type === "custom" && bucket === "main") return prefix + (language === "zh" ? "自定义传输调制" : "Custom transport modifier");
  if (definition.law_id === "ohmic") return prefix + (language === "zh" ? "有效欧姆电阻" : "Effective Ohmic resistance");
  return prefix + localizedFunctionLabel(definition.function_type, definition.display_name, language);
}

export function zoneForComponent(comp: ComponentSpec): BuilderBucket {
  return bucketForComponent(comp) === "main" ? "main" : "branches";
}

export function findComponentRef(model: ModelSpec, componentId: string | null): ComponentRef | null {
  if (!componentId) return null;
  for (const location of ["series", "core", "parallel"] as ModelLocation[]) {
    const comp = model[location].find((item) => item.id === componentId);
    if (comp) return { location, comp };
  }
  return null;
}

export function firstComponentId(model: ModelSpec): string | null {
  return model.series[0]?.id ?? model.core[0]?.id ?? model.parallel[0]?.id ?? null;
}

export function allRefsForZone(model: ModelSpec, zone: BuilderBucket): ComponentRef[] {
  const refs: ComponentRef[] = [];
  for (const location of ["series", "core", "parallel"] as ModelLocation[]) {
    for (const comp of model[location]) {
      if (zoneForComponent(comp) === zone) refs.push({ location, comp });
    }
  }
  return refs;
}

export function canonicalFunctionType(functionType: string) {
  return FUNCTION_TYPE_ALIAS_MAP[functionType] ?? functionType;
}

export function definitionForComponent(registry: FunctionDefinition[], comp: ComponentSpec) {
  return registry.find((definition) => definition.function_type === canonicalFunctionType(comp.function_type));
}

export function definitionsForBucket(registry: FunctionDefinition[], bucket: BuilderBucket) {
  return bucketDefinitions(registry, bucket);
}

export function addableDefinitionForBucket(model: ModelSpec, definitions: FunctionDefinition[], bucket: BuilderBucket, selected?: string) {
  const explicit = definitions.find((item) => item.function_type === selected);
  if (explicit && definitionHasAddableVariant(model, bucket, explicit)) return explicit;
  return definitions.find((definition) => definitionHasAddableVariant(model, bucket, definition)) ?? definitions[0];
}

export function addPolarityFor(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition): Polarity | undefined {
  const polarities = allowedPolarities(definition);
  if (!polarities.length) return undefined;
  const preferred = [definition.default_polarity, ...polarities].filter(Boolean) as Polarity[];
  return preferred.find((candidate) => {
    const pending = buildPendingComponent(model, bucket, definition, candidate);
    return !isDuplicateBlocked(model, pending);
  }) ?? preferred[0];
}

export function definitionHasAddableVariant(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition) {
  const polarities = allowedPolarities(definition);
  if (!polarities.length) return !isDuplicateBlocked(model, buildPendingComponent(model, bucket, definition));
  const preferred = [definition.default_polarity, ...polarities].filter(Boolean) as Polarity[];
  return preferred.some((polarity) => !isDuplicateBlocked(model, buildPendingComponent(model, bucket, definition, polarity)));
}

export function updateParameter(
  model: ModelSpec,
  location: Location,
  componentId: string,
  paramName: string,
  patch: Partial<ParameterSpec>,
) {
  const comp = model[location].find((item) => item.id === componentId);
  if (!comp || !comp.params[paramName]) return model;
  const next = {
    ...comp,
    params: {
      ...comp.params,
      [paramName]: { ...comp.params[paramName], ...patch },
    },
  };
  return updateComponent(model, location, componentId, next);
}

export function compactNumber(v: number | null | undefined, _unit?: string | null) {
  return formatValueWithUnit(v, null, 4);
}

export function latexText(value: string) {
  const replacements: Record<string, string> = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    "_": "\\_",
    "$": "\\$",
    "%": "\\%",
    "&": "\\&",
    "#": "\\#",
    "^": "\\^{}",
    "~": "\\textasciitilde{}",
  };
  return value.replace(/[\\{}_$%&#^~]/g, (match) => replacements[match] ?? match).replace(/ /g, " ");
}

export function latexComponentToken(value: string) {
  const trimmed = value.trim();
  if (/^D\d+$/i.test(trimmed)) return `D_{${trimmed.replace(/^[dD]/, "")}}`;
  if (/^Rsh$/i.test(trimmed)) return "R_{sh}";
  if (/^Rs$/i.test(trimmed)) return "R_s";
  if (/^[A-Za-z]+\d*$/.test(trimmed)) return trimmed;
  return `\\text{${latexText(trimmed || "component")}}`;
}

export function componentRoleLabel(comp: ComponentSpec, language: Language) {
  return componentPhysicalRole(comp, language)[language === "zh" ? "zh" : "en"];
}

export { componentEquation, aggregateVoltageEquation, aggregateCurrentEquation } from "../../model/modelDisplaySemantics";
