// Refactor note: implementation modules still consume ../model-builder/rules and ../model-builder/mutations; preset support includes makeDoubleDiodePreset / Double diode model.
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "katex/dist/katex.min.css";
import type { ModelSpec } from "../model/types";
import { findComponentRef, firstComponentId } from "./model-builder/modelHelpers";
import { ModelFlowCanvas } from "./model-builder/ModelFlowCanvas";
import type { ModelBuilderProps } from "./model-builder/types";

export { buildFlowGraph } from "./model-builder/modelFlowGraph";

export function ModelBuilder({ model, registry, onChange, language, disabled = false, onGoToFitting, previewContent }: ModelBuilderProps) {
  const [selectedDefinitions, setSelectedDefinitions] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(() => firstComponentId(model));
  useEffect(() => {
    if (selectedId && findComponentRef(model, selectedId)) return;
    setSelectedId(firstComponentId(model));
  }, [model, selectedId]);
  return <section className="card model-builder xy-circuit-builder-shell compact-model-builder-shell">
    <ReactFlowProvider>
      <ModelFlowCanvas
        model={model}
        registry={registry}
        selectedId={selectedId}
        setSelectedId={setSelectedId}
        selectedDefinitions={selectedDefinitions}
        setSelectedDefinitions={setSelectedDefinitions}
        onChange={onChange}
        language={language}
        disabled={disabled}
        onGoToFitting={onGoToFitting}
        previewContent={previewContent}
      />
    </ReactFlowProvider>
  </section>;
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
