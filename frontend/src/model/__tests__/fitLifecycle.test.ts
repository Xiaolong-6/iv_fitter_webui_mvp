import { describe, expect, it } from "vitest";
import { canGenerateReport, createCancelledLifecycle, createErrorLifecycle, createRunningLifecycle, createTimeoutLifecycle, deriveFitUiState, elapsedSecondsSince, nextRunId, shouldAcceptRunResult, terminalCancelledState } from "../fitLifecycle";

describe("fit lifecycle helpers", () => {
  it("increments run ids deterministically", () => {
    expect(nextRunId(0)).toBe(1);
    expect(nextRunId(41)).toBe(42);
  });

  it("accepts only the active non-cancelled run", () => {
    const cancelled = new Set([3]);
    expect(shouldAcceptRunResult({ activeRunId: 3, runId: 3, cancelledRunIds: cancelled })).toBe(false);
    expect(shouldAcceptRunResult({ activeRunId: 4, runId: 3, cancelledRunIds: cancelled })).toBe(false);
    expect(shouldAcceptRunResult({ activeRunId: 5, runId: 5, cancelledRunIds: cancelled })).toBe(true);
  });

  it("creates normalized cancelled and timeout states", () => {
    expect(createRunningLifecycle(2, 1000, 60)).toEqual({ kind: "running", runId: 2, startedAt: 1000, timeoutS: 60 });
    expect(createCancelledLifecycle(2, 4.8)).toEqual({ kind: "cancelled", runId: 2, elapsedSeconds: 4 });
    expect(createTimeoutLifecycle(2, 0)).toEqual({ kind: "timeout", runId: 2, timeoutS: 1 });
    expect(createErrorLifecycle(2, "boom")).toEqual({ kind: "error", runId: 2, message: "boom" });
  });

  it("derives stable UI states without component state", () => {
    expect(deriveFitUiState({ isFitting: true, hasResult: false, lifecycle: { kind: "idle" } })).toBe("running");
    expect(deriveFitUiState({ isFitting: false, hasResult: true, resultSuccess: true, resultReportable: true, lifecycle: { kind: "idle" } })).toBe("completed");
    expect(deriveFitUiState({ isFitting: false, hasResult: true, resultSuccess: true, resultReportable: false, lifecycle: { kind: "idle" } })).toBe("gate_failed");
    expect(deriveFitUiState({ isFitting: false, hasResult: false, lifecycle: createTimeoutLifecycle(7, 60) })).toBe("timeout");
  });

  it("keeps report availability tied to completed current-state results", () => {
    expect(canGenerateReport({ hasSelectedTrace: true, isFitting: false, hasResult: true, lifecycle: { kind: "idle" } })).toBe(true);
    expect(canGenerateReport({ hasSelectedTrace: true, isFitting: true, hasResult: true, lifecycle: createRunningLifecycle(1, 0, 60) })).toBe(false);
    expect(canGenerateReport({ hasSelectedTrace: false, isFitting: false, hasResult: true, lifecycle: { kind: "idle" } })).toBe(false);
    expect(canGenerateReport({ hasSelectedTrace: true, isFitting: false, hasResult: false, lifecycle: createCancelledLifecycle(1, 3) })).toBe(false);
  });

  it("computes elapsed seconds from a monotonic run timestamp", () => {
    expect(elapsedSecondsSince(1000, 6200)).toBe(5);
    expect(elapsedSecondsSince(null, 6200)).toBe(0);
    expect(terminalCancelledState(9, 1000, 6200)).toEqual({ kind: "cancelled", runId: 9, elapsedSeconds: 5 });
  });
});
