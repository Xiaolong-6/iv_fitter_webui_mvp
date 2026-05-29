import { describe, expect, it } from "vitest";
import type { FitResult, ModelSpec } from "../types";
import {
  buildParameterRows,
  componentLawFormPlacement,
  countParameterFilters,
  filterParameterRows,
  groupParameterRows,
  parameterRowStatus,
  placementGroupForComponent,
  seedComponentFromFittedValues,
} from "../parameterGrouping";

function model(): ModelSpec {
  return {
    core: [{ id: "D1", location: "core", function_type: "diode", law_id: "shockley", evaluation_form: "current_branch", placement: "junction_current_branch", params: { I0_A: { value: 1e-12, lower: 1e-20, upper: 1e-3, fit: true, unit: "A" }, n: { value: 1.5, lower: 1, upper: 2, fit: false } } }],
    series: [{ id: "Rs", location: "series", function_type: "ohmic", law_id: "ohmic", evaluation_form: "voltage_drop", placement: "series_voltage_drop", params: { Rs_ohm: { value: 10, lower: 0, upper: 1e6, fit: true, unit: "Ω" } } }],
    parallel: [],
    temperature_K: 300,
    version: "test",
  };
}

function result(): FitResult {
  return {
    success: true, reportable: true, message: "ok", model: model(), config: { weighting: "linear", loss: "linear", fit_speed: "full", exclude_compliance: false, max_nfev: 10 },
    parameters: { "D1.I0_A": { value: 1e-20, lower: 1e-20, upper: 1e-3, fixed: false, stderr: 1e-22, unit: "A" }, "D1.n": { value: 1.5, lower: 1, upper: 2, fixed: true }, "Rs.Rs_ohm": { value: 120, lower: 0, upper: 1e6, fixed: false, stderr: 240, unit: "Ω" } },
    metrics: {}, warnings: [], curves: { voltage_V: [], current_measured_A: [], current_fit_A: [], residual_A: [] }, equations: { title: "", voltage_relation: [], core: [], series: [], parallel: [], auxiliary: [] }, software_version: "test",
  };
}

describe("parameter grouping filters", () => {
  it("classifies and filters table rows", () => {
    const rows = buildParameterRows(model(), result());
    expect(parameterRowStatus(rows.find((row) => row.key === "D1.I0_A")!, result())).toBe("near_bound");
    expect(parameterRowStatus(rows.find((row) => row.key === "D1.n")!, result())).toBe("fixed");
    expect(parameterRowStatus(rows.find((row) => row.key === "Rs.Rs_ohm")!, result())).toBe("weak");
    expect(filterParameterRows(rows, result(), "near_bound")).toHaveLength(1);
    expect(filterParameterRows(rows, result(), "fixed")).toHaveLength(1);
    expect(filterParameterRows(rows, result(), "weak")).toHaveLength(1);
    expect(filterParameterRows(rows, result(), "all")).toHaveLength(3);
  });

  it("separates main path and junction branches and reports counts", () => {
    const rows = buildParameterRows(model(), result());
    const grouped = groupParameterRows(rows, result());
    expect(grouped.map((group) => group.id)).toEqual(["main", "junction"]);
    expect(countParameterFilters(rows, result()).weak).toBe(1);
    expect(placementGroupForComponent(model().series[0])).toBe("main");
    expect(placementGroupForComponent(model().core[0])).toBe("junction");
    expect(componentLawFormPlacement(model().series[0])).toEqual({ law: "ohmic", form: "voltage_drop", placement: "series_voltage_drop" });
  });

  it("can seed only one component from fitted values without changing topology", () => {
    const seeded = seedComponentFromFittedValues(model(), result(), "series", "Rs");
    expect(seeded.series[0].params.Rs_ohm.value).toBe(120);
    expect(seeded.core[0].params.I0_A.value).toBe(1e-12);
    expect(seeded.series[0].placement).toBe("series_voltage_drop");
  });
});
