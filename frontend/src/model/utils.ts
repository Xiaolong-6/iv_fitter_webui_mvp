import type { ComponentSpec, EvaluationForm, FunctionDefinition, ModelSpec, ParameterSpec, Polarity, TraceData } from "./types";
let nextId = 1;
export function buildParams(def: FunctionDefinition, nickname?: string): Record<string, ParameterSpec> {
  const params: Record<string, ParameterSpec> = {};
  for (const p of def.parameters) {
    const label = def.law_id === "ohmic" ? (nickname ?? "R") : p.name;
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
    : def.function_type === "diode" ? "D1"
    : def.function_type === "photocurrent_constant" ? "Iph"
    : def.function_type === "photocurrent_voltage_dependent" ? "Iph(V)"
    : def.function_type === "photoconductive_branch" ? "Gph"
    : def.function_type === "photo_modulated_main_path" ? "Rphoto"
    : def.display_name.split(" ")[0];
  return { id: `${idBase}_${nextId++}`, location, function_type: def.function_type, law_id: def.law_id, evaluation_form, placement, polarity: polarity ?? def.default_polarity ?? null, mode: def.mode ?? null, params: buildParams(def, nickname), metadata: def.function_type === "custom" ? { nickname, expression: evaluation_form === "conductance_modifier" ? "A*softplus(u)" : "s*A*softplus(u)**m" } : { nickname } };
}
export function createComponent(def: FunctionDefinition, polarity?: Polarity): ComponentSpec { return createComponentInLocation(def, def.location, polarity); }
export function cloneModel(model: ModelSpec): ModelSpec { return JSON.parse(JSON.stringify(model)); }
export function updateComponent(model: ModelSpec, location: keyof Pick<ModelSpec, "core"|"series"|"parallel">, id: string, next: ComponentSpec): ModelSpec { const copy = cloneModel(model); copy[location] = copy[location].map((c) => c.id === id ? next : c); return copy; }
export function removeComponent(model: ModelSpec, location: keyof Pick<ModelSpec, "core"|"series"|"parallel">, id: string): ModelSpec { const copy = cloneModel(model); copy[location] = copy[location].filter((c) => c.id !== id); return copy; }
export function addComponent(model: ModelSpec, component: ComponentSpec): ModelSpec { const copy = cloneModel(model); (copy[component.location] as ComponentSpec[]).push(component); return copy; }

function splitLine(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { quoted = !quoted; continue; }
    if (!quoted && (ch === "," || ch === "\t" || ch === ";")) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}
function normalizeHeader(s: string) { return s.toLowerCase().trim().replace(/[\s\-/]+/g, "_").replace(/[()\[\]]/g, ""); }
function inferIndex(headers: string[], kind: "voltage"|"current") {
  const norms = headers.map(normalizeHeader);
  const exact = kind === "voltage" ? ["v", "voltage", "voltage_v", "bias_v", "source_v", "set_v", "measured_voltage_v", "smu_voltage_v", "source_value"] : ["i", "current", "current_a", "measured_current_a", "smu_current_a", "measured_value", "ch1"];
  for (const cand of exact) { const idx = norms.indexOf(cand); if (idx >= 0) return idx; }
  for (let i = 0; i < norms.length; i++) {
    const h = norms[i];
    if (kind === "voltage" && (h.includes("volt") || h.includes("bias") || h === "v" || h === "source_value")) return i;
    if (kind === "current" && (h.includes("current") || h.endsWith("_a") || h === "i" || h === "measured_value" || h === "ch1")) return i;
  }
  return kind === "voltage" ? 0 : 1;
}
function finiteTrace(v: number[], i: number[], traceId: string, metadata: Record<string, unknown>): TraceData | null {
  const voltage: number[] = [];
  const current: number[] = [];
  for (let k = 0; k < Math.min(v.length, i.length); k++) {
    if (Number.isFinite(v[k]) && Number.isFinite(i[k])) { voltage.push(v[k]); current.push(i[k]); }
  }
  if (voltage.length < 3) return null;
  return { voltage_V: voltage, current_A: current, trace_id: traceId, metadata: { ...metadata, points: voltage.length } };
}
function commentValue(lines: string[], key: string) {
  const kn = key.toLowerCase();
  for (const line of lines) {
    if (!line.trim().startsWith("#")) continue;
    const parts = splitLine(line.replace(/^#\s*/, ""));
    if ((parts[0] ?? "").toLowerCase() === kn) return parts[1] ?? "";
  }
  return "";
}
function dataSectionLines(lines: string[]) {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim().startsWith("#")) continue;
    const parts = splitLine(lines[i].replace(/^#\s*/, ""));
    if ((parts[0] ?? "").toLowerCase() === "section" && (parts[1] ?? "").toLowerCase() === "data") idx = i;
  }
  return idx >= 0 ? lines.slice(idx + 1).filter((l) => l.trim() && !l.trim().startsWith("#")) : lines.filter((l) => l.trim() && !l.trim().startsWith("#"));
}
function cleanTraceId(s: string, fallback: string) {
  return (s || fallback).replace(/^T(\d+)\s*/i, "T$1 ").replace(/\s+/g, " ").trim();
}

export function parseCsvTraces(text: string, fileName = "imported"): TraceData[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const schema = commentValue(lines, "schema");
  const format = commentValue(lines, "format");
  const dataLines = dataSectionLines(lines);
  if (dataLines.length < 2) throw new Error("Need a CSV/TXT file with voltage and current columns.");
  const headers = splitLine(dataLines[0]);
  const rows = dataLines.slice(1).map(splitLine).filter((r) => r.some(Boolean));
  const hnorm = headers.map(normalizeHeader);

  // HappyMeasure combined long-v2: one row per trace point.
  if (format === "long-v2" || (hnorm.includes("trace_index") && hnorm.includes("source_value") && hnorm.includes("measured_value"))) {
    const idxTrace = hnorm.indexOf("trace_index");
    const idxName = hnorm.indexOf("device_name");
    const idxSource = hnorm.indexOf("source_value");
    const idxMeasured = hnorm.indexOf("measured_value");
    const groups = new Map<string, { name: string; v: number[]; i: number[] }>();
    for (const row of rows) {
      const key = row[idxTrace] || "1";
      const g = groups.get(key) ?? { name: row[idxName] || `T${String(key).padStart(3, "0")}`, v: [], i: [] };
      g.v.push(Number(row[idxSource]));
      g.i.push(Number(row[idxMeasured]));
      groups.set(key, g);
    }
    const traces = [...groups.entries()].map(([key, g]) => finiteTrace(g.v, g.i, cleanTraceId(`T${String(key).padStart(3, "0")} ${g.name}`, `trace_${key}`), { source: "happymeasure-long-v2", schema, format, trace_index: key, voltage_col: "source_value", current_col: "measured_value" })).filter(Boolean) as TraceData[];
    if (!traces.length) throw new Error("No finite HappyMeasure long-v2 traces were found.");
    return traces;
  }

  // HappyMeasure combined wide-v2: shared source axis, one measured column per trace.
  if (format === "wide-v2" || (schema === "combined-v2" && headers.length > 3) || headers.some((h) => /^T\d{3}\s/i.test(h))) {
    const xIdx = hnorm.includes("elapsed_s") ? 1 : inferIndex(headers, "voltage");
    const traceCols = headers.map((h, idx) => ({ h, idx })).filter(({ idx }) => idx !== xIdx && normalizeHeader(headers[idx]) !== "elapsed_s");
    const x = rows.map((r) => Number(r[xIdx]));
    const traces = traceCols.map(({ h, idx }, n) => finiteTrace(x, rows.map((r) => Number(r[idx])), cleanTraceId(h.replace(/\[[^\]]+\]/g, ""), `T${String(n + 1).padStart(3, "0")}`), { source: "happymeasure-wide-v2", schema, format, voltage_col: headers[xIdx], current_col: h, trace_column_index: idx })).filter(Boolean) as TraceData[];
    if (!traces.length) throw new Error("No finite HappyMeasure wide-v2 traces were found.");
    return traces;
  }

  // HappyMeasure single-v2 normally starts with Elapsed_s, source, measured.
  const vIdx = hnorm[0] === "elapsed_s" && headers.length >= 3 ? 1 : inferIndex(headers, "voltage");
  const iIdx = hnorm[0] === "elapsed_s" && headers.length >= 3 ? 2 : inferIndex(headers, "current");
  const trace = finiteTrace(rows.map((r) => Number(r[vIdx])), rows.map((r) => Number(r[iIdx])), fileName, { source: schema ? "happymeasure-single-v2" : "browser-import", schema, format: format || "single", voltage_col: headers[vIdx] ?? "column_1", current_col: headers[iIdx] ?? "column_2" });
  if (!trace) throw new Error("Need at least three finite V/I rows. For HappyMeasure files, check that the exported CSV includes source and measured columns.");
  return [trace];
}
export function parseCsvTrace(text: string, traceId = "imported"): TraceData { return parseCsvTraces(text, traceId)[0]; }
export function emptyTrace(): TraceData { return { voltage_V: [], current_A: [], trace_id: "no trace loaded", metadata: { empty: true } }; }
export function sampleTrace(): TraceData {
  const voltage = Array.from({ length: 81 }, (_, i) => -4 + i * 0.1);
  const current = voltage.map((v) => 2e-12 * (Math.exp(Math.min(v / (1.7 * 0.02585), 80)) - 1) + v / 1e9);
  return { voltage_V: voltage, current_A: current, trace_id: "synthetic-D1-Rsh", metadata: { generated: true } };
}

export function estimateResidualFloorA(trace: TraceData): number {
  const values = trace.current_A.map((x) => Math.abs(x)).filter((x) => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!values.length) return 1e-15;
  const p10 = values[Math.max(0, Math.min(values.length - 1, Math.floor(values.length * 0.10)))];
  const median = values[Math.floor(values.length * 0.50)] ?? p10;
  const floor = Math.max(1e-15, Math.min(p10 * 0.01, median * 1e-4));
  return Number(floor.toExponential(3));
}
