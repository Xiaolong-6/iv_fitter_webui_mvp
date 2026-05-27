import { describe, expect, it } from "vitest";
import type { FitResult, ModelSpec, TraceData } from "../types";
import { buildHtmlReportDocument } from "../htmlReport";

function model(): ModelSpec {
  return { core: [], parallel: [], series: [], temperature_K: 300, version: "test" };
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
});
