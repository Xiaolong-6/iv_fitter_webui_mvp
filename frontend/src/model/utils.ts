import type { ComponentSpec, EvaluationForm, FunctionDefinition, ModelSpec, ParameterSpec, Polarity, TraceData } from "./types";
let nextId = 1;
export function buildParams(def: FunctionDefinition, nickname?: string): Record<string, ParameterSpec> {
  const params: Record<string, ParameterSpec> = {};
  for (const p of def.parameters) {
    const neutralBiasLabels: Record<string, string> = {
      Iph0_A: "I0",
      Aph: "A",
      Vt_ph_V: "Vt",
      Vs_ph_V: "Vs",
      m_ph: "m",
    };
    const label = def.law_id === "ohmic" ? (nickname ?? "R")
      : def.function_type === "bias_dependent_current" || def.function_type === "photocurrent_voltage_dependent" || def.function_type === "voltage_dependent_photocurrent" ? (neutralBiasLabels[p.name] ?? p.name)
      : p.name;
    params[p.name] = { value: p.default, lower: p.lower ?? null, upper: p.upper ?? null, fit: p.fit, unit: p.unit ?? null, label, description: p.description };
  }
  return params;
}
function defaultPlacementForLocation(def: FunctionDefinition, location: "core"|"series"|"parallel") {
  if (location === "series" && def.allowed_placements.includes("series_voltage_drop")) return "series_voltage_drop";
  if (location === "series" && def.allowed_placements.includes("series_conductance_modifier")) return "series_conductance_modifier";
  if (location === "core" && def.allowed_placements.includes("junction_current_branch")) return "junction_current_branch";
  if (location === "parallel" && def.allowed_placements.includes("parallel_current_branch")) return "parallel_current_branch";
  return def.default_placement;
}
function defaultFormForLocation(def: FunctionDefinition, location: "core"|"series"|"parallel"): EvaluationForm {
  if (location === "series" && def.available_forms.includes("voltage_drop")) return "voltage_drop";
  if (location === "series" && def.available_forms.includes("conductance_modifier")) return "conductance_modifier";
  if ((location === "core" || location === "parallel") && def.available_forms.includes("current_branch")) return "current_branch";
  return def.default_form;
}
export function createComponentInLocation(def: FunctionDefinition, location: "core"|"series"|"parallel", polarity?: Polarity): ComponentSpec {
  const idBase = (def.law_id || def.function_type).replace(/[^a-z0-9]+/gi, "_");
  const placement = defaultPlacementForLocation(def, location);
  const evaluation_form = defaultFormForLocation(def, location);
  const nickname = def.law_id === "ohmic" ? (location === "series" ? "Rs" : "Rsh")
    : def.function_type === "series_diode_barrier" ? "Barrier1"
    : def.function_type === "series_power_law_drop" ? "Softplus1"
    : def.function_type === "diode" ? "D1"
    : def.function_type === "photocurrent_constant" ? "Iph"
    : def.function_type === "bias_dependent_current" || def.function_type === "photocurrent_voltage_dependent" || def.function_type === "voltage_dependent_photocurrent" ? "Ibias(V)"
    : def.display_name.split(" ")[0];
  const componentPolarity = def.allowed_polarities.length ? (polarity ?? def.default_polarity ?? null) : null;
  return { id: `${idBase}_${nextId++}`, location, function_type: def.function_type, law_id: def.law_id, evaluation_form, placement, polarity: componentPolarity, mode: def.mode ?? null, params: buildParams(def, nickname), metadata: def.function_type === "custom" ? { nickname, expression: evaluation_form === "conductance_modifier" ? "A*softplus(u)" : "s*A*softplus(u)**m" } : { nickname } };
}
export function createComponent(def: FunctionDefinition, polarity?: Polarity): ComponentSpec { return createComponentInLocation(def, def.location, polarity); }
export function cloneModel(model: ModelSpec): ModelSpec { return JSON.parse(JSON.stringify(model)); }
export function updateComponent(model: ModelSpec, location: keyof Pick<ModelSpec, "core"|"series"|"parallel">, id: string, next: ComponentSpec): ModelSpec { const copy = cloneModel(model); copy[location] = copy[location].map((c) => c.id === id ? next : c); return copy; }
export function removeComponent(model: ModelSpec, location: keyof Pick<ModelSpec, "core"|"series"|"parallel">, id: string): ModelSpec { const copy = cloneModel(model); copy[location] = copy[location].filter((c) => c.id !== id); return copy; }
export function addComponent(model: ModelSpec, component: ComponentSpec): ModelSpec { const copy = cloneModel(model); (copy[component.location] as ComponentSpec[]).push(component); return copy; }

export function emptyTrace(): TraceData { return { voltage_V: [], current_A: [], trace_id: "no trace loaded", metadata: { empty: true } }; }

export function estimateResidualFloorA(trace: TraceData): number {
  const values = trace.current_A.map((x) => Math.abs(x)).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!values.length) return 1e-15;
  const p10 = values[Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.10)))];
  const median = values[Math.floor(values.length * 0.50)] ?? p10;
  const floor = Math.max(1e-15, Math.min(p10 * 0.01, median * 1e-4));
  return Number(floor.toExponential(3));
}
