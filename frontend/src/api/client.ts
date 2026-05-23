import type { FitConfig, FitResult, FunctionDefinition, ModelSpec, TraceData, EquationSummary, FitWarning } from "../model/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://127.0.0.1:8000";

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
