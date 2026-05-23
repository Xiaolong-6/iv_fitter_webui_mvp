import type { FitConfig, FitResult, FunctionDefinition, ModelSpec, TraceData, EquationSummary, FitWarning } from "../model/types";

function resolveApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE;
  if (configured && configured.trim()) return configured.replace(/\/+$/, "");

  if (typeof window !== "undefined" && window.location?.hostname) {
    const { protocol, hostname } = window.location;
    if (protocol === "http:" || protocol === "https:") {
      return `${protocol}//${hostname}:8000`;
    }
  }
  return "http://127.0.0.1:8000";
}

const API_BASE = resolveApiBase();

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

export async function getRegistry(): Promise<FunctionDefinition[]> {
  const response = await fetch(`${API_BASE}/api/component-registry`);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
export async function validateModel(model: ModelSpec): Promise<FitWarning[]> { return postJson("/api/validate-model", model); }
export async function equations(model: ModelSpec): Promise<EquationSummary> { return postJson("/api/equations", model); }
export async function fitTrace(trace: TraceData, model: ModelSpec, config: FitConfig): Promise<FitResult> { return postJson("/api/fit", { trace, model, config }); }
export async function exportReport(result: FitResult): Promise<{ markdown: string }> { return postJson("/api/export-report", result); }

export interface ImportQualitySummary {
  rows_in_file: number;
  rows_imported: number;
  rows_dropped: number;
  voltage_col: string;
  current_col: string;
  voltage_min_V: number;
  voltage_max_V: number;
  current_min_A: number;
  current_max_A: number;
  warnings: string[];
}

export interface ImportCsvTextMultiResponse {
  traces: Array<{ trace: TraceData; quality: ImportQualitySummary }>;
}

export async function importCsvTextMulti(text: string, traceId = "imported_trace"): Promise<ImportCsvTextMultiResponse> {
  return postJson("/api/import-csv-text-multi", { text, trace_id: traceId });
}
