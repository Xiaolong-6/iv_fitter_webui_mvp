// Refactor note: implementation modules still consume ../model-builder/rules and ../model-builder/mutations; preset support includes makeDoubleDiodePreset / Double diode model.
import "@xyflow/react/dist/style.css";
import "katex/dist/katex.min.css";
import type { ModelSpec } from "../model/types";
import type { ModelBuilderProps } from "./model-builder/types";
import { SchematicBuilderV3 } from "../model-builder-v3";
import { renderModelBuilderV3EquivalentCircuitSvg } from "../model-builder-v3/export/equivalentCircuitSvg";

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
  const svg = renderModelBuilderV3EquivalentCircuitSvg(model, language);
  return (
    <div
      className="readonly-equivalent-circuit-view"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
