import "@xyflow/react/dist/style.css";
import "katex/dist/katex.min.css";
import type { ModelSpec } from "../model/types";
import type { ModelBuilderProps } from "../model-builder/types";
import { SchematicBuilder } from "../model-builder";
import { renderModelBuilderEquivalentCircuitSvg } from "../model-builder/export/equivalentCircuitSvg";

export function ModelBuilder(props: ModelBuilderProps) {
  return (
    <SchematicBuilder
      model={props.model}
      onChange={props.onChange}
      canvasActions={props.canvasActions}
      onGoToFitting={props.onGoToFitting}
    />
  );
}

export function EquivalentCircuitView({ model, language }: { model: ModelSpec; language: ModelBuilderProps["language"] }) {
  const svg = renderModelBuilderEquivalentCircuitSvg(model, language);
  return (
    <div
      className="readonly-equivalent-circuit-view"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
