import { useState } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModelBuilder, buildFlowGraph } from "../ModelBuilder";
import { createInitialModel } from "../../model/defaults";
import type { FunctionDefinition, ModelSpec } from "../../model/types";

const registry: FunctionDefinition[] = [
  {
    function_type: "diode",
    location: "core",
    display_name: "Shockley diode",
    role: "branch",
    law_id: "shockley_diode",
    law_name: "Shockley diode",
    canonical_equation: "I=I0(exp(V/nVT)-1)",
    available_forms: ["current_branch"],
    default_form: "current_branch",
    allowed_placements: ["junction_current_branch", "parallel_current_branch"],
    default_placement: "junction_current_branch",
    allowed_polarities: ["forward", "reverse"],
    default_polarity: "forward",
    parameters: [
      { name: "I0_A", default: 1e-12, lower: 1e-30, upper: 1, unit: "A", fit: true, description: "Saturation current" },
      { name: "n", default: 1.5, lower: 0.5, upper: 10, fit: true, description: "Ideality factor" },
    ],
    equation_template: "",
    help_text: "",
  },
  {
    function_type: "constant_rs",
    location: "series",
    display_name: "Ohmic resistance",
    role: "resistance",
    law_id: "ohmic",
    law_name: "Ohmic law",
    canonical_equation: "V=IR",
    available_forms: ["voltage_drop", "current_branch"],
    default_form: "voltage_drop",
    allowed_placements: ["series_voltage_drop", "parallel_current_branch"],
    default_placement: "series_voltage_drop",
    allowed_polarities: [],
    parameters: [
      { name: "Rs_ohm", default: 10, lower: 0, upper: 1e9, unit: "Ω", fit: true, description: "Resistance" },
    ],
    equation_template: "",
    help_text: "",
  },
];

afterEach(cleanup);

function renderBuilder(model: ModelSpec = createInitialModel("test")) {
  let latest = model;
  function Harness() {
    const [current, setCurrent] = useState(model);
    latest = current;
    return <ModelBuilder model={current} registry={registry} language="en" onChange={(next) => { latest = next; setCurrent(next); }} />;
  }
  const view = render(<Harness />);
  return { ...view, getCurrent: () => latest };
}

describe("ModelBuilder circuit canvas", () => {
  it("renders the default single diode preset as an equivalent circuit", () => {
    const { getByTestId, getByText, getAllByText } = renderBuilder();
    expect(getByTestId("equivalent-circuit-canvas")).toBeInTheDocument();
    expect(getByText("Junction branches")).toBeInTheDocument();
    expect(getAllByText("Main path").length).toBeGreaterThan(0);
    expect(getByText("Junction branches")).toBeInTheDocument();
    expect(getAllByText("Rs").length).toBeGreaterThan(0);
    expect(getAllByText("D1").length).toBeGreaterThan(0);
    expect(getAllByText("Rsh").length).toBeGreaterThan(0);
  });

  it("selecting a component opens the inspector for that component", () => {
    const { getByText, getByTestId } = renderBuilder();
    fireEvent.click(getByText("D1"));
    expect(getByTestId("component-inspector")).toHaveTextContent("D1");
    expect(getByTestId("component-inspector")).toHaveTextContent("Parameters");
  });

  it("applying the double diode preset replaces the model and keeps existing ids usable", () => {
    const { getByTestId, getAllByText, getCurrent } = renderBuilder();
    fireEvent.change(getByTestId("model-preset-select"), { target: { value: "double" } });
    expect(getCurrent().core.map((component) => component.id)).toContain("D1");
    expect(getCurrent().parallel.map((component) => component.id)).toContain("D2");
    expect(getAllByText("D2").length).toBeGreaterThan(0);
  });

  it("parameter edits preserve the ModelSpec contract", () => {
    const model = createInitialModel("test");
    const { getByDisplayValue, getCurrent } = renderBuilder(model);
    const valueInput = getByDisplayValue("10");
    fireEvent.change(valueInput, { target: { value: "25" } });
    fireEvent.blur(valueInput);
    const next = getCurrent();
    expect(next.series[0].params.Rs_ohm.value).toBe(25);
    expect(next.series[0].id).toBe(model.series[0].id);
    expect(next.series[0].placement).toBe("series_voltage_drop");
  });

  it("rebuilds xyflow wiring when components are added or removed", () => {
    const single = createInitialModel("test");
    const singleGraph = buildFlowGraph(single, null, "en");
    expect(singleGraph.edges.map((item) => item.id)).toEqual(expect.arrayContaining([
      "edge:vext-main0",
      "edge:main-ohmic_1-vi",
      "edge:vi-D1",
      "edge:D1-ground",
      "edge:vi-ohmic_2",
      "edge:ohmic_2-ground",
    ]));

    const double = {
      ...single,
      parallel: [
        ...single.parallel,
        { ...single.core[0], id: "D2", location: "parallel" as const, placement: "parallel_current_branch" as const, metadata: { nickname: "D2", role: "secondary" } },
      ],
    };
    const doubleGraph = buildFlowGraph(double, "D2", "en");
    expect(doubleGraph.nodes.some((item) => item.id === "component:D2")).toBe(true);
    expect(doubleGraph.edges.map((item) => item.id)).toEqual(expect.arrayContaining(["edge:vi-D2", "edge:D2-ground"]));

    const removedMain = { ...single, series: [] };
    const removedGraph = buildFlowGraph(removedMain, null, "en");
    expect(removedGraph.edges.map((item) => item.id)).toContain("edge:vext-vi");
    expect(removedGraph.edges.map((item) => item.id)).not.toContain("edge:vext-main0");
  });
});
