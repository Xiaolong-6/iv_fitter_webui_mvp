import type { FitResult, ModelSpec, TraceData } from "../../model/types";
import type { FitLifecycleState } from "../../model/fitLifecycle";

export function modelSummary(model: ModelSpec) {
  const names = [...model.series, ...model.core, ...model.parallel].map(
    (component) =>
      String(component.metadata?.nickname ?? component.id ?? component.law_id),
  );
  return names.length ? names.join(" + ") : "No model";
}

export function fitStateText(
  result: FitResult | null,
  isFitting: boolean,
  lifecycle: FitLifecycleState,
) {
  if (isFitting) return "Running";
  if (result) {
    if (result.success && result.reportable) return "Converged";
    if (result.success) return "Gate failed";
    return "Failed";
  }
  if (lifecycle.kind === "cancelled") return "Cancelled";
  if (lifecycle.kind === "timeout") return "Timeout";
  if (lifecycle.kind === "error") return "Error";
  return "Not run";
}

export function nextStepText(
  hasSelectedTrace: boolean,
  result: FitResult | null,
  isFitting: boolean,
  lifecycle: FitLifecycleState,
) {
  if (!hasSelectedTrace) return "Next: Go to Data";
  if (isFitting) return "Next: Wait for completion";
  if (lifecycle.kind === "error") return "Next: Review diagnostics";
  if (!result) return "Next: Go to Fitting";
  return result.success ? "Next: Review Report" : "Next: Review diagnostics";
}

export function WorkflowContextBar({
  selectedTrace,
  hasSelectedTrace,
  model,
  result,
  isFitting,
  lifecycle,
  reportAvailable,
}: {
  selectedTrace: TraceData;
  hasSelectedTrace: boolean;
  model: ModelSpec;
  result: FitResult | null;
  isFitting: boolean;
  lifecycle: FitLifecycleState;
  reportAvailable: boolean;
}) {
  return (
    <section className="workflow-context-bar" aria-label="Project context">
      <span>
        <strong>Trace:</strong>{" "}
        {hasSelectedTrace
          ? String(selectedTrace.metadata?.trace_name ?? selectedTrace.trace_id)
          : "No trace loaded"}
      </span>
      <span>
        <strong>Model:</strong> {modelSummary(model)}
      </span>
      <span>
        <strong>Fit:</strong> {fitStateText(result, isFitting, lifecycle)}
      </span>
      <span>
        <strong>Report:</strong>{" "}
        {reportAvailable
          ? result?.reportable
            ? "Available"
            : "Review only"
          : "Not available"}
      </span>
      <span className="workflow-next-step">
        {nextStepText(hasSelectedTrace, result, isFitting, lifecycle)}
      </span>
    </section>
  );
}
