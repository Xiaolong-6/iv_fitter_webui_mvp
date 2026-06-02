// Refactor note: implementation modules still consume ../model-builder/rules and ../model-builder/mutations; preset support includes makeDoubleDiodePreset / Double diode model.
import "@xyflow/react/dist/style.css";
import "katex/dist/katex.min.css";
import { ReactFlowProvider } from "@xyflow/react";
import type { ModelSpec } from "../model/types";
import type { ModelBuilderProps } from "./model-builder/types";
import { SchematicBuilderV3 } from "../model-builder-v3";
import { ModelFlowCanvas } from "./model-builder/ModelFlowCanvas";

export { buildFlowGraph } from "./model-builder/modelFlowGraph";

export function ModelBuilder(props: ModelBuilderProps) {
  return (
    <SchematicBuilderV3
      model={props.model}
      onChange={props.onChange}
      canvasActions={props.canvasActions}
      onGoToFitting={props.onGoToFitting}
    />
  );
}

export function EquivalentCircuitView({ model, language }: { model: ModelSpec; language: ModelBuilderProps["language"] }) {
  const noop = () => undefined;
  return <div className="readonly-equivalent-circuit-view">
    <ReactFlowProvider>
      <ModelFlowCanvas
        model={model}
        registry={[]}
        selectedId={null}
        setSelectedId={noop}
        selectedDefinitions={{}}
        setSelectedDefinitions={(fn) => { void fn; }}
        onChange={() => undefined}
        language={language}
        readOnly
      />
    </ReactFlowProvider>
  </div>;
}
