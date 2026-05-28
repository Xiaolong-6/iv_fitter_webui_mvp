import type { ModelSpec, SyntheticArtifactConfig, SyntheticNoiseConfig, SyntheticTraceRequest, SyntheticTraceResponse, TraceData } from "./types";

export const MAX_SYNTHETIC_POINTS = 10000;

export interface SyntheticTraceFormState {
  traceName: string;
  voltageStart: string;
  voltageStop: string;
  voltageStep: string;
  noiseMode: SyntheticNoiseConfig["mode"];
  noiseLevelA: string;
  relativeNoiseFraction: string;
  seed: string;
  complianceEnabled: boolean;
  complianceCurrentA: string;
}

export interface SyntheticTraceValidation {
  ok: boolean;
  error: string | null;
  pointCount: number;
}

export const defaultSyntheticTraceForm: SyntheticTraceFormState = {
  traceName: "synthetic_trace",
  voltageStart: "-1",
  voltageStop: "1",
  voltageStep: "0.02",
  noiseMode: "none",
  noiseLevelA: "1e-12",
  relativeNoiseFraction: "0.01",
  seed: "1",
  complianceEnabled: false,
  complianceCurrentA: "0.001",
};

function asNumber(value: string): number {
  return Number(value.trim());
}

export function buildSyntheticTracePayload(form: SyntheticTraceFormState, model: ModelSpec, traceName: string): SyntheticTraceRequest {
  const noise_config: SyntheticNoiseConfig = form.noiseMode === "gaussian_absolute"
    ? { mode: "gaussian_absolute", noise_level_A: Number(form.noiseLevelA) }
    : form.noiseMode === "gaussian_relative"
      ? { mode: "gaussian_relative", relative_noise_fraction: Number(form.relativeNoiseFraction) }
      : { mode: "none" };
  return {
    model,
    trace_name: traceName,
    voltage_start: Number(form.voltageStart),
    voltage_stop: Number(form.voltageStop),
    voltage_step: Number(form.voltageStep),
    noise_config,
    artifact_config: form.complianceEnabled
      ? { compliance_enabled: true, compliance_current_A: Number(form.complianceCurrentA) }
      : { compliance_enabled: false },
    seed: form.seed.trim() ? Number(form.seed) : null,
  };
}

export function syntheticTraceCsv(response: SyntheticTraceResponse, header = "voltage_V,current_A"): string {
  return [header, ...response.voltage_V.map((v, idx) => `${v},${response.current_A[idx]}`)].join("\n");
}

export function syntheticPointCount(voltageStart: number, voltageStop: number, voltageStep: number): number {
  if (!Number.isFinite(voltageStart) || !Number.isFinite(voltageStop) || !Number.isFinite(voltageStep) || voltageStep <= 0 || voltageStart === voltageStop) return 0;
  return Math.floor(Math.abs(voltageStop - voltageStart) / voltageStep + 1e-12) + 1;
}

export function validateSyntheticTraceForm(form: SyntheticTraceFormState): SyntheticTraceValidation {
  const start = asNumber(form.voltageStart);
  const stop = asNumber(form.voltageStop);
  const step = asNumber(form.voltageStep);
  if (!Number.isFinite(start) || !Number.isFinite(stop) || !Number.isFinite(step)) return { ok: false, error: "Voltage start, stop, and step must be finite numbers.", pointCount: 0 };
  if (step <= 0) return { ok: false, error: "V step must be > 0.", pointCount: 0 };
  if (start === stop) return { ok: false, error: "V start and V stop must be different.", pointCount: 0 };
  const pointCount = syntheticPointCount(start, stop, step);
  if (pointCount > MAX_SYNTHETIC_POINTS) return { ok: false, error: `Voltage sweep has ${pointCount} points; limit is ${MAX_SYNTHETIC_POINTS}.`, pointCount };
  if (form.noiseMode === "gaussian_absolute") {
    const level = asNumber(form.noiseLevelA);
    if (!Number.isFinite(level) || level < 0) return { ok: false, error: "Absolute noise level must be >= 0 A.", pointCount };
  }
  if (form.noiseMode === "gaussian_relative") {
    const fraction = asNumber(form.relativeNoiseFraction);
    if (!Number.isFinite(fraction) || fraction < 0) return { ok: false, error: "Relative noise fraction must be >= 0.", pointCount };
  }
  if (form.seed.trim() && !Number.isInteger(Number(form.seed))) return { ok: false, error: "Random seed must be an integer.", pointCount };
  if (form.complianceEnabled) {
    const limit = asNumber(form.complianceCurrentA);
    if (!Number.isFinite(limit) || limit <= 0) return { ok: false, error: "Compliance current must be > 0 A.", pointCount };
  }
  return { ok: true, error: null, pointCount };
}

export function syntheticResponseToTrace(response: SyntheticTraceResponse): TraceData {
  return {
    voltage_V: response.voltage_V,
    current_A: response.current_A,
    trace_id: response.trace_name,
    metadata: {
      ...response.metadata,
      voltage_unit: "V",
      current_unit: "A",
      voltage_unit_factor_to_V: 1,
      current_unit_factor_to_A: 1,
      unit_mode: "import_unit_to_si_internal",
    },
  };
}

export function uniqueTraceId(baseName: string, traces: TraceData[]): string {
  const clean = baseName.trim().replace(/\s+/g, " ") || "synthetic_trace";
  const existing = new Set(traces.map((trace) => trace.trace_id));
  if (!existing.has(clean)) return clean;
  let suffix = 2;
  let next = `${clean} ${suffix}`;
  while (existing.has(next)) next = `${clean} ${++suffix}`;
  return next;
}

export function appendSyntheticTrace(traces: TraceData[], response: SyntheticTraceResponse): { traces: TraceData[]; selectedTraceId: string } {
  const trace = syntheticResponseToTrace(response);
  const traceId = uniqueTraceId(trace.trace_id, traces);
  const nextTrace = traceId === trace.trace_id ? trace : { ...trace, trace_id: traceId, metadata: { ...trace.metadata, dataset_name: traceId } };
  return { traces: [...traces, nextTrace], selectedTraceId: nextTrace.trace_id };
}
