import { useState, type ReactNode } from "react";
import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModelBuilder, buildFlowGraph } from "../ModelBuilder";
import { createInitialModel } from "../../model/defaults";
import type { ComponentSpec, FunctionDefinition, ModelSpec } from "../../model/types";

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
  {
    function_type: "custom",
    location: "parallel",
    display_name: "Custom expression law",
    role: "user_defined_law",
    law_id: "custom_expression",
    law_name: "User-defined mathematical relation",
    canonical_equation: "expression",
    available_forms: ["current_branch", "conductance_modifier"],
    default_form: "current_branch",
    allowed_placements: ["parallel_current_branch", "junction_current_branch", "series_conductance_modifier"],
    default_placement: "parallel_current_branch",
    allowed_polarities: ["forward", "reverse", "symmetric"],
    default_polarity: "forward",
    parameters: [
      { name: "A", default: 1e-9, lower: -1e3, upper: 1e3, unit: "A", fit: true, description: "Scale parameter" },
      { name: "Vt_V", default: 0, lower: -200, upper: 200, unit: "V", fit: true, description: "Threshold" },
      { name: "Vs_V", default: 1, lower: 1e-9, upper: 100, unit: "V", fit: true, description: "Softness" },
      { name: "m", default: 1, lower: -10, upper: 10, unit: "", fit: true, description: "Exponent" },
    ],
    equation_template: "expression",
    help_text: "Safe custom expression",
  },
];

afterEach(cleanup);

function renderBuilder(model: ModelSpec = createInitialModel("test"), canvasActions?: ReactNode) {
  let latest = model;
  function Harness() {
    const [current, setCurrent] = useState(model);
    latest = current;
    return <ModelBuilder model={current} registry={registry} language="en" onChange={(next) => { latest = next; setCurrent(next); }} canvasActions={canvasActions} />;
  }
  const view = render(<Harness />);
  return { ...view, getCurrent: () => latest };
}

describe("ModelBuilder circuit canvas", () => {
  it("renders the default single diode preset as an equivalent circuit", () => {
    const { getByTestId, getAllByText } = renderBuilder();
    expect(getByTestId("equivalent-circuit-canvas")).toBeInTheDocument();
    expect(getAllByText("Rs").length).toBeGreaterThan(0);
    expect(getAllByText("D1").length).toBeGreaterThan(0);
    expect(getAllByText("Rsh").length).toBeGreaterThan(0);
  });

  it("selecting a component opens the editor for that component", () => {
    const { getByText, getByTestId } = renderBuilder();
    fireEvent.click(getByText("D1"));
    const editor = getByTestId("equivalent-circuit-canvas").querySelector('[aria-label="Component details"]');
    expect(editor).toBeTruthy();
    expect(editor!.textContent).toContain("D1");
    expect(editor!.textContent).toContain("Name");
  });

  it("applying the double diode preset replaces the model and keeps existing ids usable", () => {
    const { getByTestId, getAllByText, getCurrent } = renderBuilder();
    fireEvent.change(getByTestId("model-preset-select"), { target: { value: "double" } });
    expect(getCurrent().core.map((component) => component.id)).toContain("D1");
    expect(getCurrent().parallel.map((component) => component.id)).toContain("D2");
    expect(getAllByText("D2").length).toBeGreaterThan(0);
  });

  it("rename preserves the ModelSpec contract", () => {
    const model = createInitialModel("test");
    const { getCurrent } = renderBuilder(model);
    const componentNode = document.querySelector('[data-component-id="ohmic_1"]');
    expect(componentNode).toBeTruthy();
    fireEvent.click(componentNode!);
    const canvas = document.querySelector('[data-testid="equivalent-circuit-canvas"]');
    const nameInput = canvas!.querySelector<HTMLInputElement>('[aria-label="Component details"] input');
    expect(nameInput).toBeTruthy();
    fireEvent.change(nameInput!, { target: { value: "Rs_series" } });
    fireEvent.blur(nameInput!);
    const next = getCurrent();
    expect(next.series[0].id).toBe(model.series[0].id);
    expect(next.series[0].placement).toBe("series_voltage_drop");
    expect(next.series[0].metadata?.nickname).toBe("Rs_series");
  });

  it("rebuilds xyflow wiring when components are added or removed", () => {
    const single = createInitialModel("test");
    const singleGraph = buildFlowGraph(single, null, "en");
    expect(singleGraph.edges.map((item) => item.id)).toEqual(expect.arrayContaining([
      "edge:path:main:terminal:vext-component:ohmic_1",
      "edge:path:main:component:ohmic_1-junction:left",
      "edge:path:D1:junction:left-component:D1",
      "edge:path:D1:component:D1-junction:right",
      "edge:path:ohmic_2:junction:left-component:ohmic_2",
      "edge:path:ohmic_2:component:ohmic_2-junction:right",
      "edge:right-ground",
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
    expect(doubleGraph.edges.map((item) => item.id)).toEqual(expect.arrayContaining(["edge:path:D2:junction:left-component:D2", "edge:path:D2:component:D2-junction:right"]));

    const removedMain = { ...single, series: [] };
    const removedGraph = buildFlowGraph(removedMain, null, "en");
    expect(removedGraph.edges.map((item) => item.id)).toContain("edge:path:main:terminal:vext-junction:left");
    expect(removedGraph.edges.map((item) => item.id)).not.toContain("edge:path:main:terminal:vext-component:ohmic_1");
  });
  it("renders plus-driven insertion affordances on paths instead of toolbar add buttons", () => {
    const { container } = renderBuilder();
    expect(container.querySelector(".xy-canvas-add-controls")).toBeNull();
    const graph = buildFlowGraph(createInitialModel("test"), null, "en");
    expect(graph.nodes.map((item) => item.id)).toContain("action:add-parallel-path");
    expect(graph.edges.some((item) => item.data?.addMode === "serial")).toBe(true);
    expect(graph.edges.some((item) => item.data?.addMode === "parallel")).toBe(true);
  });

  it("shows the synthetic trace action directly instead of nesting it in Advanced", () => {
    const { queryByText, getByText } = renderBuilder(createInitialModel("test"), <button type="button">Synthetic IV trace</button>);
    expect(queryByText("Advanced")).toBeNull();
    expect(getByText("Synthetic IV trace")).toBeInTheDocument();
  });


  it("removes the bottom model preview drawer and keeps equations in the selected inspector", () => {
    const { queryByText } = renderBuilder();
    expect(queryByText("Model preview")).toBeNull();
    const graph = buildFlowGraph(createInitialModel("test"), null, "en");
    expect(graph.nodes.map((item) => item.id)).not.toEqual(expect.arrayContaining(["annotation:voltage", "annotation:current"]));
  });

  it("keeps selected component equations in the inspector instead of adding cramped canvas overlays", () => {
    const graph = buildFlowGraph(createInitialModel("test"), "D1", "en");
    expect(graph.nodes.some((item) => String(item.id).startsWith("annotation:selected:"))).toBe(false);
  });

  it("uses neutral circuit wires and only lightweight linked-edge selected state", () => {
    const model = createInitialModel("test");
    const selectedGraph = buildFlowGraph(model, "D1", "en");
    expect(selectedGraph.edges.every((item) => item.style?.stroke === "#111827" || item.style?.stroke === "#0f172a" || item.style?.stroke === "#2563eb")).toBe(true);
    expect(selectedGraph.edges.some((item) => item.className?.includes("is-edge-highlighted-branch"))).toBe(false);
    expect(selectedGraph.edges.some((item) => item.className?.includes("is-edge-linked-to-selected"))).toBe(true);
  });



  it("switches an auto-named branch to a user-facing custom branch law", () => {
    const { getCurrent } = renderBuilder(createInitialModel("test"));
    const componentNode = document.querySelector('[data-component-id="D1"]');
    expect(componentNode).toBeTruthy();
    fireEvent.click(componentNode!);
    const editor = document.querySelector('[aria-label="Component details"]') as HTMLElement | null;
    expect(editor).toBeTruthy();
    const selects = editor!.querySelectorAll("select");
    const modelSelect = selects[1] as HTMLSelectElement | null;
    expect(modelSelect).toBeTruthy();
    fireEvent.change(modelSelect!, { target: { value: "custom" } });

    const next = getCurrent();
    expect(next.core[0].function_type).toBe("custom");
    expect(next.core[0].metadata?.nickname).toBe("custom");
    expect(next.core[0].metadata?.expression).toBe("A * Vi");
    expect(next.core[0].params.A.unit).toBe("A/V");

    const updatedEditor = document.querySelector('[aria-label="Component details"]') as HTMLElement | null;
    expect(updatedEditor?.textContent).toContain("Unified variables");
    expect(updatedEditor?.textContent).not.toContain("Advanced · Custom expression law");
    expect(updatedEditor?.textContent).toContain("Use V and I directly");
    expect(updatedEditor?.textContent).toContain("Parameter notes");
    const equation = updatedEditor!.querySelector(".xy-canvas-component-equation");
    const compactText = equation?.textContent?.replace(/\s/g, "") ?? "";
    expect(compactText).toContain("I=AVi");
    expect(compactText).not.toContain("Rbase");
  });

  it("binds custom expression validation to the editor value and previews the entered formula", () => {
    const customMain: ComponentSpec = {
      id: "custom_main",
      location: "series",
      function_type: "custom",
      law_id: "custom_expression",
      evaluation_form: "voltage_drop",
      placement: "series_voltage_drop",
      polarity: null,
      mode: null,
      params: {
        A: { value: 1e-9, lower: -1e3, upper: 1e3, fit: true, unit: "A", label: "A", description: "Scale parameter" },
      },
      metadata: { nickname: "custom", expression: "A * I", expressionSource: "user" },
    };
    const model: ModelSpec = { ...createInitialModel("test"), series: [customMain] };
    renderBuilder(model);
    const componentNode = document.querySelector('[data-component-id="custom_main"]');
    expect(componentNode).toBeTruthy();
    fireEvent.click(componentNode!);
    const editor = document.querySelector('[aria-label="Component details"]') as HTMLElement | null;
    expect(editor).toBeTruthy();
    const textarea = editor!.querySelector("textarea") as HTMLTextAreaElement | null;
    expect(textarea?.value).toBe("A * I");
    expect(editor!.textContent).not.toContain("Expression cannot be empty");
    const equation = editor!.querySelector(".xy-canvas-component-equation");
    const compactText = equation?.textContent?.replace(/\s/g, "") ?? "";
    expect(compactText).toContain("ΔV=AI");
    expect(compactText).not.toContain("Rbase");
    expect(compactText).not.toContain("softplus(u)");
  });

});
