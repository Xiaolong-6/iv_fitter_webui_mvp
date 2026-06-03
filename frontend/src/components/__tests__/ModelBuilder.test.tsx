import { useState, type ReactNode } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ModelBuilder, EquivalentCircuitView } from "../ModelBuilder";
import { createInitialModel } from "../../model/defaults";
import type { FunctionDefinition, ModelSpec } from "../../model/types";
import { compileMb3Graph } from "../../model-builder-v3/domain/compile";
import { MB3_BUILT_IN_PRESETS } from "../../model-builder-v3/domain/presets";

const registry: FunctionDefinition[] = [];

afterEach(cleanup);

function renderBuilder(model: ModelSpec = createInitialModel("test"), canvasActions?: ReactNode) {
  let latest = model;
  function Harness() {
    const [current, setCurrent] = useState(model);
    latest = current;
    return (
      <ModelBuilder
        model={current}
        registry={registry}
        language="en"
        onChange={(next) => {
          latest = next;
          setCurrent(next);
        }}
        canvasActions={canvasActions}
      />
    );
  }
  const view = render(<Harness />);
  return { ...view, getCurrent: () => latest };
}

describe("ModelBuilder V3 shell", () => {
  it("renders the V3 canvas and component list instead of the legacy canvas", () => {
    const { getByTestId, getByText, queryByTestId } = renderBuilder();
    expect(getByTestId("model-builder-v3-canvas")).toBeInTheDocument();
    expect(getByText("Model Builder")).toBeInTheDocument();
    expect(getByText("Components")).toBeInTheDocument();
    expect(getByText("Resistance")).toBeInTheDocument();
    expect(queryByTestId("equivalent-circuit-canvas")).toBeNull();
  });

  it("publishes a schematic_v3 model graph to the parent workflow", async () => {
    const { getCurrent } = renderBuilder();
    await waitFor(() => {
      expect(getCurrent().graph?.schema_version).toBe("schematic_v3");
    });
    expect(getCurrent().graph?.metadata?.modelBuilderV3).toBeTruthy();
  });

  it("shows the synthetic trace action directly on the V3 toolbar", () => {
    const { getByText, queryByText } = renderBuilder(createInitialModel("test"), <button type="button">Synthetic IV trace</button>);
    expect(queryByText("Advanced")).toBeNull();
    expect(getByText("Synthetic IV trace")).toBeInTheDocument();
  });
});

describe("EquivalentCircuitView V3 renderer", () => {
  it("renders V3 equivalent-circuit SVG from modelBuilderV3 metadata", () => {
    const graph = MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph;
    const compiled = compileMb3Graph(graph, createInitialModel("test"));
    const { container } = render(<EquivalentCircuitView model={compiled.model} language="en" />);
    expect(container.querySelector('svg[aria-label="V3 equivalent circuit"]')).toBeTruthy();
    expect(container.textContent).toContain("V");
    expect(container.textContent).toContain("GND");
    expect(container.textContent).toContain("Rs");
    expect(container.textContent).toContain("D1");
    expect(container.textContent).toContain("Rsh");
  });
});
