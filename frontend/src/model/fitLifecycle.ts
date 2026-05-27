export type FitLifecycleState =
  | { kind: "idle" }
  | { kind: "running"; runId: number; startedAt: number; timeoutS: number }
  | { kind: "cancelled"; runId: number; elapsedSeconds: number }
  | { kind: "timeout"; runId: number; timeoutS: number }
  | { kind: "error"; runId?: number; message: string };

export type FitUiState = FitLifecycleState["kind"] | "completed" | "gate_failed";

export function isCurrentRun(activeRunId: number | null, runId: number): boolean {
  return activeRunId === runId;
}

export function shouldAcceptRunResult(args: {
  activeRunId: number | null;
  runId: number;
  cancelledRunIds?: ReadonlySet<number>;
}): boolean {
  return isCurrentRun(args.activeRunId, args.runId) && !(args.cancelledRunIds?.has(args.runId) ?? false);
}

export function nextRunId(currentRunSeq: number): number {
  return currentRunSeq + 1;
}

export function createRunningLifecycle(runId: number, startedAt: number, timeoutS: number): FitLifecycleState {
  return { kind: "running", runId, startedAt, timeoutS };
}

export function createCancelledLifecycle(runId: number, elapsedSeconds: number): FitLifecycleState {
  return { kind: "cancelled", runId, elapsedSeconds: Math.max(0, Math.floor(elapsedSeconds)) };
}

export function createTimeoutLifecycle(runId: number, timeoutS: number): FitLifecycleState {
  return { kind: "timeout", runId, timeoutS: Math.max(1, Math.floor(timeoutS)) };
}

export function createErrorLifecycle(runId: number | undefined, message: string): FitLifecycleState {
  return { kind: "error", runId, message };
}

export function deriveFitUiState(args: {
  isFitting: boolean;
  hasResult: boolean;
  resultSuccess?: boolean;
  resultReportable?: boolean;
  lifecycle: FitLifecycleState;
}): FitUiState {
  if (args.isFitting) return "running";
  if (args.hasResult) {
    if (args.resultSuccess && args.resultReportable) return "completed";
    if (args.resultSuccess) return "gate_failed";
    return "error";
  }
  return args.lifecycle.kind;
}

export function canGenerateReport(args: {
  hasSelectedTrace: boolean;
  isFitting: boolean;
  hasResult: boolean;
  lifecycle: FitLifecycleState;
}): boolean {
  return args.hasSelectedTrace && !args.isFitting && args.hasResult && args.lifecycle.kind !== "running";
}
