import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { Background, Controls, Panel, ReactFlow, useReactFlow } from "@xyflow/react";
import type { FunctionDefinition, ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket } from "../../model-builder/rules";
import { addDefinitionToModel, applyNicknameToParams } from "../../model-builder/mutations";
import { createComponentInLocation, removeComponent, updateComponent } from "../../model/utils";
import {
  addPolarityFor,
  addableDefinitionForBucket,
  definitionsForBucket,
  findComponentRef,
  firstComponentId,
  makeSingleDiodePreset,
} from "./modelHelpers";
import { ModelFlowContextProvider, type ModelFlowContextValue } from "./flowContext";
import { nodeTypes } from "./flowNodes";
import { edgeTypes } from "./ButtonEdge";
import { buildFlowGraph } from "./modelFlowGraph";
import { ModelPresetControls } from "./PresetControls";
import { ComponentCanvasEditor } from "./ComponentCanvasEditor";

export function ModelFlowCanvas({ model, registry, selectedId, setSelectedId, selectedDefinitions, setSelectedDefinitions, onChange, language, disabled, onGoToFitting, readOnly = false, previewContent }: {
  model: ModelSpec;
  registry: FunctionDefinition[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedDefinitions: Record<string, string>;
  setSelectedDefinitions: (patch: (current: Record<string, string>) => Record<string, string>) => void;
  onChange: (model: ModelSpec) => void;
  language: Language;
  disabled?: boolean;
  onGoToFitting?: () => void;
  readOnly?: boolean;
  previewContent?: ReactNode;
}) {
  const { fitView } = useReactFlow();

  const selectFirst = useCallback((next: ModelSpec) => {
    setSelectedId(firstComponentId(next));
  }, [setSelectedId]);

  const setAddDefinition = useCallback((bucket: BuilderBucket, functionType: string) => {
    setSelectedDefinitions((current) => ({ ...current, [bucket]: functionType }));
  }, [setSelectedDefinitions]);

  const addFrom = useCallback((bucket: BuilderBucket, functionType?: string) => {
    if (readOnly || disabled) return;
    const definitions = definitionsForBucket(registry, bucket);
    const definition = functionType
      ? definitions.find((item) => item.function_type === functionType)
      : addableDefinitionForBucket(model, definitions, bucket, selectedDefinitions[bucket]);
    if (!definition) return;
    const result = addDefinitionToModel(model, bucket, definition, addPolarityFor(model, bucket, definition));
    if (!result.added) return;
    onChange(result.model);
    setSelectedId(result.component.id);
  }, [disabled, model, onChange, readOnly, registry, selectedDefinitions, setSelectedId]);

  const resetModel = useCallback(() => {
    if (disabled || readOnly) return;
    const next = makeSingleDiodePreset(model);
    onChange(next);
    selectFirst(next);
  }, [disabled, model, onChange, readOnly, selectFirst]);

  const removeById = useCallback((componentId: string) => {
    if (disabled || readOnly) return;
    const ref = findComponentRef(model, componentId);
    if (!ref) return;
    const next = removeComponent(model, ref.location, ref.comp.id);
    onChange(next);
    setSelectedId(firstComponentId(next));
  }, [disabled, model, onChange, readOnly, setSelectedId]);

  const renameById = useCallback((componentId: string, nextName: string) => {
    if (disabled || readOnly) return;
    const ref = findComponentRef(model, componentId);
    const cleanName = nextName.trim();
    if (!ref || !cleanName) return;
    const nextComponent = applyNicknameToParams(ref.comp, cleanName);
    onChange(updateComponent(model, ref.location, ref.comp.id, nextComponent));
  }, [disabled, model, onChange, readOnly]);

  const replaceDefinitionById = useCallback((componentId: string, functionType: string) => {
    if (disabled || readOnly) return;
    const ref = findComponentRef(model, componentId);
    if (!ref) return;
    const bucket = ref.comp.location === "series" ? "main" : "branches";
    const definition = definitionsForBucket(registry, bucket).find((item) => item.function_type === functionType);
    if (!definition) return;
    const replacement = createComponentInLocation(definition, ref.location, addPolarityFor(model, bucket, definition));
    const prevNick = typeof ref.comp.metadata?.nickname === "string" ? ref.comp.metadata.nickname : null;
    const nick = prevNick ?? ref.comp.id;
    const renamed = applyNicknameToParams({
      ...replacement,
      id: ref.comp.id,
      location: ref.location,
      metadata: { ...(replacement.metadata ?? {}), nickname: nick },
    }, nick);
    onChange(updateComponent(model, ref.location, ref.comp.id, renamed));
  }, [disabled, model, onChange, readOnly, registry]);

  const updateExpressionById = useCallback((componentId: string, expression: string) => {
    if (disabled || readOnly) return;
    const ref = findComponentRef(model, componentId);
    if (!ref) return;
    const nextComponent = {
      ...ref.comp,
      metadata: { ...(ref.comp.metadata ?? {}), expression },
    };
    onChange(updateComponent(model, ref.location, ref.comp.id, nextComponent));
  }, [disabled, model, onChange, readOnly]);

  const graph = useMemo(() => buildFlowGraph(model, selectedId, language, {
    readOnly,
    disabled,
    registry,
  }), [model, selectedId, language, readOnly, disabled, registry]);

  useEffect(() => {
    if (!readOnly) return undefined;
    const timer = window.setTimeout(() => fitView({ padding: 0.22, duration: 180, maxZoom: 1.0 }), 60);
    return () => window.clearTimeout(timer);
  }, [fitView, graph.nodes.length, graph.edges.length, readOnly]);

  const contextValue = useMemo<ModelFlowContextValue>(() => ({
    model,
    registry,
    language,
    disabled,
    readOnly,
    selectedDefinitions,
    removeById,
    addFrom,
    setAddDefinition,
    renameById,
    replaceDefinitionById,
    updateExpressionById,
  }), [addFrom, disabled, language, model, readOnly, registry, removeById, renameById, replaceDefinitionById, updateExpressionById, selectedDefinitions, setAddDefinition]);

  return <ModelFlowContextProvider value={contextValue}>
    <div className={`xy-model-workspace ${readOnly ? "xy-model-readonly" : ""}`} data-testid="equivalent-circuit-canvas">
      <div className="xy-model-flow-shell">
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={{ type: "smoothstep", style: { strokeWidth: 2.4, stroke: "#111827" } }}
          fitView={readOnly}
          fitViewOptions={{ padding: 0.22, maxZoom: 1.0 }}
          defaultViewport={readOnly ? undefined : { x: 96, y: 84, zoom: 1 }}
          minZoom={readOnly ? 0.45 : 0.45}
          maxZoom={readOnly ? 1.4 : 2.4}
          nodesDraggable={false}
          nodesConnectable={false}
          edgesFocusable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          connectOnClick={false}
          panOnScroll={false}
          zoomOnScroll={!readOnly}
          zoomOnPinch={!readOnly}
          zoomOnDoubleClick={!readOnly}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          onNodeClick={(_, node) => {
            if (readOnly) return;
            const refItem = node.data.refItem;
            if (refItem) setSelectedId(refItem.comp.id);
          }}
          onPaneClick={() => {
            if (!readOnly) setSelectedId(null);
          }}
        >
          <Background gap={24} size={1.4} />
          {!readOnly ? <Controls showInteractive={false} /> : null}
          {!readOnly ? <Panel position="top-left" className="xy-canvas-preset-panel">
            <ModelPresetControls model={model} language={language} onChange={onChange} disabled={disabled} onAfterPreset={selectFirst} onResetModel={resetModel} onGoToFitting={onGoToFitting} />
          </Panel> : null}
          {!readOnly && selectedId ? <Panel position="top-right" className="xy-canvas-editor-panel">
            <ComponentCanvasEditor selectedId={selectedId} />
          </Panel> : null}
          {!readOnly && previewContent ? <Panel position="bottom-center" className="xy-canvas-preview-panel">
            <details className="modern-model-preview canvas-model-preview">
              <summary>
                <span className="preview-summary-title">{language === "zh" ? "模型预览" : "Model preview"}</span>
                <span className="preview-summary-formula preview-summary-formula-primary">Vj = Vext − ΣΔV</span>
                <span className="preview-summary-formula">I = Σ branches</span>
                <span className="preview-summary-cta">{language === "zh" ? "展开方程" : "Expand equations"}</span>
              </summary>
              {previewContent}
            </details>
          </Panel> : null}
        </ReactFlow>
      </div>
    </div>
  </ModelFlowContextProvider>;
}
