import type { ComponentSpec, FitResult, ModelSpec, TraceData } from "../model/types";
import { updateComponent } from "../model/utils";

export function warningDismissKey(result: FitResult | null) {
  return result
    ? [
        result.success ? "success" : "failed",
        result.reportable ? "reportable" : "not-reportable",
        result.reportability_reason ?? result.message,
        result.metrics.linear_rmse_A,
        ...result.warnings.map((w) => `${w.severity}:${w.code}:${w.message}`),
      ].join("|")
    : "";
}

export function selectedTraceGroundTruth(trace: TraceData): Record<string, unknown> | null {
  const metadata = trace.metadata ?? {};
  if (metadata.synthetic !== true) return null;
  const raw = metadata.ground_truth_parameters;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function fitResultIsSafeToPromote(fit: FitResult): boolean {
  if (!fit.success || !fit.reportable) return false;
  const normalizedRmse = fit.metrics.normalized_rmse;
  const logMae = fit.metrics.log_magnitude_mae_decades;
  const severeWarnings = fit.warnings.some(
    (warning) =>
      warning.severity === "error" ||
      ["parameter_bound", "model_not_reportable", "junction_solver_failed", "graph_solver_kcl_failed"].includes(warning.code),
  );
  if (severeWarnings) return false;
  if (Number.isFinite(normalizedRmse) && normalizedRmse > 0.25) return false;
  if (Number.isFinite(logMae) && logMae > 0.5) return false;
  if ((fit.fit_diagnostics?.active_bounds?.length ?? 0) > 0 && Number.isFinite(normalizedRmse) && normalizedRmse > 0.05) return false;
  return true;
}

export function updateModelParameter(
  model: ModelSpec,
  componentId: string,
  paramName: string,
  patch: Partial<ComponentSpec["params"][string]>,
) {
  for (const location of ["core", "series", "parallel"] as const) {
    const comp = model[location].find((item) => item.id === componentId);
    if (!comp || !comp.params[paramName]) continue;
    const next = {
      ...comp,
      params: {
        ...comp.params,
        [paramName]: { ...comp.params[paramName], ...patch },
      },
    };
    return updateComponent(model, location, componentId, next);
  }
  return model;
}
