import { describe, expect, it } from "vitest";
import type { FitResult, ModelSpec } from "../types";
import { componentNickname, currentDataScale, fitQualityVerdict, parameterShortAssessment, parameterValueRows, plotAnomalyMessage } from "../diagnostics";

function sampleModel(): ModelSpec {
  return {
    core: [{
      id: "D1",
      location: "core",
      function_type: "diode",
      law_id: "shockley",
      evaluation_form: "current_branch",
      placement: "junction_current_branch",
      polarity: "forward",
      params: {
        I0_A: { value: 1e-12, lower: 1e-20, upper: 1e-3, unit: "A", fit: true, label: "I0" },
        n: { value: 1.5, lower: 0.8, upper: 5, fit: true },
      },
      metadata: { nickname: "Dmain" },
    }],
    series: [],
    parallel: [],
    temperature_K: 300,
    version: "test",
  };
}

function result(overrides: Partial<FitResult> = {}): FitResult {
  const model = sampleModel();
  return {
    success: true,
    reportable: true,
    message: "ok",
    model,
    config: { weighting: "linear", loss: "linear", fit_speed: "full", exclude_compliance: false, max_nfev: 100 },
    parameters: {
      "D1.I0_A": { value: 1e-20, fixed: false, lower: 1e-20, upper: 1e-3, stderr: 1e-22, unit: "A" },
      "D1.n": { value: 5.1, fixed: false, lower: 0.8, upper: 10, stderr: 0.1 },
    },
    metrics: { linear_rmse_A: 1e-8, log_magnitude_mae_decades: 0.02 },
    warnings: [],
    curves: {
      voltage_V: [0, 1, 2],
      current_measured_A: [0, 1e-6, 2e-6],
      current_fit_A: [0, 1.01e-6, 2.01e-6],
      residual_A: [0, -1e-8, -1e-8],
    },
    equations: { title: "test", voltage_relation: [], core: [], series: [], parallel: [], auxiliary: [] },
    software_version: "test",
    ...overrides,
  };
}

describe("diagnostic helpers", () => {
  it("computes robust current data scale and component nicknames", () => {
    expect(currentDataScale([0, 1e-9, 1e-6, 1e-3])).toBeGreaterThan(1e-6);
    expect(componentNickname(sampleModel(), "D1")).toBe("Dmain");
    expect(componentNickname(sampleModel(), "missing")).toBe("missing");
  });

  it("summarizes parameter concerns", () => {
    const r = result();
    expect(parameterShortAssessment(r, "D1.I0_A", "en")).toContain("near bound");
    expect(parameterShortAssessment(r, "D1.n", "en")).toContain("n > 2");
  });

  it("returns fit quality verdicts for reportability and good fits", () => {
    expect(fitQualityVerdict(result({ reportable: false, reportability_reason: "gate failed" }), "en")).toMatchObject({ severity: "error", title: "Not reportable yet" });
    expect(fitQualityVerdict(result(), "en")).toMatchObject({ severity: "ok", title: "Looks numerically plausible" });
  });

  it("detects abnormal plotted fit ranges", () => {
    const r = result({ curves: { voltage_V: [0], current_measured_A: [1e-9], current_fit_A: [1e12], residual_A: [1e12] } });
    expect(plotAnomalyMessage(r, { voltage_V: [0], current_A: [1e-9], trace_id: "t", metadata: {} }, "en")).toContain("abnormal");
  });

  it("builds parameter rows from fitted values when a result is available", () => {
    const rows = parameterValueRows(sampleModel(), result());
    expect(rows).toHaveLength(2);
    expect(rows[0].label).toBe("Dmain.I0");
    expect("fixed" in rows[0].value).toBe(true);
  });
});
