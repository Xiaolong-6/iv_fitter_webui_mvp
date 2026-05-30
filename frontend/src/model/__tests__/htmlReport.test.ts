import { describe, expect, it } from "vitest";
import type { FitResult, ModelSpec, TraceData } from "../types";
import { buildHtmlReportDocument } from "../htmlReport";

function model(): ModelSpec {
  return {
    core: [{ id: "D1", location: "core", function_type: "diode", law_id: "shockley_diode", evaluation_form: "current_branch", placement: "junction_current_branch", polarity: "forward", params: { I0_A: { value: 1e-12 }, n: { value: 1.5 } }, metadata: { nickname: "D1" } }],
    parallel: [{ id: "ohmic_2", location: "parallel", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "current_branch", placement: "parallel_current_branch", params: { Rs_ohm: { value: 1e9 } }, metadata: { nickname: "Rsh" } }],
    series: [{ id: "ohmic_1", location: "series", function_type: "constant_rs", law_id: "ohmic", evaluation_form: "voltage_drop", placement: "series_voltage_drop", params: { Rs_ohm: { value: 10 } }, metadata: { nickname: "Rs" } }],
    temperature_K: 300,
    version: "test",
  };
}

function result(): FitResult {
  return {
    success: true,
    reportable: true,
    message: "ok <safe>",
    model: model(),
    config: { weighting: "linear", loss: "linear", fit_speed: "full", exclude_compliance: false, max_nfev: 10 },
    parameters: { "D1.I0_A": { value: 1e-12, fixed: false, lower: 1e-30, upper: 1, stderr: 1e-13, unit: "A" } },
    metrics: { linear_rmse_A: 1e-9 },
    warnings: [{ severity: "warning", code: "demo", message: "check > trust" }],
    curves: { voltage_V: [0], current_measured_A: [0], current_fit_A: [0], residual_A: [0] },
    equations: { title: "", voltage_relation: [], core: [], series: [], parallel: [], auxiliary: [] },
    software_version: "test",
  };
}

const trace: TraceData = { trace_id: "Trace <1>", voltage_V: [0], current_A: [0], metadata: {} };

describe("HTML report export", () => {
  it("builds a standalone escaped HTML document", () => {
    const html = buildHtmlReportDocument({ result: result(), trace, markdownReport: "hello <world>", exportedAt: new Date("2026-01-01T00:00:00.000Z") });
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("IV-fitter report");
    expect(html).toContain("Trace &lt;1&gt;");
    expect(html).toContain("hello &lt;world&gt;");
    expect(html).toContain("2026-01-01T00:00:00.000Z");
    expect(html).toContain("Linear I-V");
    expect(html).toContain("Log |I|");
    expect(html).toContain("Signed residual");
  });

  it("includes an equivalent circuit section with SVG and component names", () => {
    const html = buildHtmlReportDocument({ result: result(), trace });
    expect(html).toContain("Equivalent circuit");
    expect(html).toContain("<svg");
    expect(html).toContain("Vext");
    expect(html).toContain("Vi");
    expect(html).toContain("V=0");
    expect(html).toContain("Rs");
    expect(html).toContain("D1");
    expect(html).toContain("Rsh");
  });
});
