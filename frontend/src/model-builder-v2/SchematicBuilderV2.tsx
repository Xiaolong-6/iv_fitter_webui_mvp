import { useEffect, useMemo, useRef, useState } from "react";
import type { FunctionDefinition, ModelSpec } from "../model/types";
import type { Language } from "../model/i18n";
import type { ReactNode } from "react";
import { applySchematicGraphToModel } from "./domain/graphCompile";
import { createEmptySchematicGraph, graphFromModelOrDefault } from "./domain/initialGraph";
import { duplicateComponent, deleteComponent } from "./domain/schematicMutations";
import { validateSchematicGraph } from "./domain/graphValidation";
import { SchematicCanvas } from "./reactflow/SchematicCanvas";
import { ComponentPalette } from "./panels/ComponentPalette";
import { ComponentInspector } from "./panels/ComponentInspector";
import { ValidationPanel } from "./panels/ValidationPanel";
import "./styles/model-builder-v2.css";

export function SchematicBuilderV2({
  model,
  onChange,
  language,
  disabled = false,
  onUseLegacy,
  registry,
  previewContent,
  canvasActions,
  onGoToFitting,
}: {
  model: ModelSpec;
  onChange: (model: ModelSpec) => void;
  language: Language;
  disabled?: boolean;
  onUseLegacy?: () => void;
  registry?: FunctionDefinition[];
  previewContent?: ReactNode;
  canvasActions?: ReactNode;
  onGoToFitting?: () => void;
}) {
  const [graph, setGraph] = useState(() => graphFromModelOrDefault(model));
  const didPublishGraphRef = useRef(false);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState("ohmic_R");
  const isZh = language === "zh";
  const unavailableFeatures = [
    isZh ? "V2 使用内置元件库；运行时 registry 扩展仍在 legacy builder 中。" : "V2 uses the built-in palette; runtime registry extension remains in the legacy builder.",
    isZh ? "方程预览、合成 IV 工具和完整拟合跳转仍作为 V2 外部工具显示。" : "Equation preview, synthetic IV tools, and full fitting navigation remain external to the V2 canvas.",
  ];
  useEffect(() => {
    if (!didPublishGraphRef.current) {
      didPublishGraphRef.current = true;
      return;
    }
    onChange(applySchematicGraphToModel(model, graph));
    // model is intentionally omitted: graph edits should update the current parent model without reinitializing local graph.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graph]);
  const validation = useMemo(() => validateSchematicGraph(graph), [graph]);
  const selectedComponent = graph.components.find((component) => component.id === selectedComponentId) ?? null;
  const updateGraph = (nextGraph: typeof graph) => setGraph(nextGraph);
  return (
    <section className={`mbv2-shell ${disabled ? "is-disabled" : ""}`} aria-label="Model Builder V2">
      <header className="mbv2-toolbar">
        <div>
          <strong>{isZh ? "模型构建器 V2" : "Model Builder V2"}</strong>
          <span>{isZh ? "自由两端器件电路图编辑器" : "Free two-terminal schematic editor"}</span>
        </div>
        <div className="mbv2-toolbar-actions">
          {canvasActions ? <div className="mbv2-toolbar-slot">{canvasActions}</div> : null}
          {onGoToFitting ? <button type="button" onClick={onGoToFitting}>{isZh ? "进入拟合" : "Go to Fit"}</button> : null}
          <button type="button" onClick={() => setGraph(createEmptySchematicGraph())}>{isZh ? "新建空白图" : "New blank graph"}</button>
          {onUseLegacy ? <button type="button" onClick={onUseLegacy}>{isZh ? "旧版构建器" : "Legacy builder"}</button> : null}
        </div>
      </header>
      <div className="mbv2-scope-banner" role="note">
        <strong>{isZh ? "V2 范围提示" : "V2 scope note"}</strong>
        <span>{unavailableFeatures.join(" ")}</span>
        {registry?.length ? <em>{isZh ? `已加载 registry：${registry.length} 项；V2 当前使用内置 palette。` : `Registry loaded: ${registry.length} entries; V2 currently uses the built-in palette.`}</em> : null}
      </div>
      <div className="mbv2-layout">
        <ComponentPalette onSelectPreset={setActivePresetId} />
        <main className="mbv2-main">
          <div className="mbv2-canvas-banner">
            <span>{isZh ? "从左侧拖入元件，连接端口。只有 V→GND 连通子图会进入求解。" : "Drag components from the palette. Connect ports with horizontal/vertical wires. Only the V→GND connected subgraph is compiled."}</span>
            <strong>{validation.valid ? (isZh ? "可编译" : "Ready") : (isZh ? "草稿" : "Draft")}</strong>
          </div>
          <SchematicCanvas
            graph={graph}
            selectedComponentId={selectedComponentId}
            activePresetId={activePresetId}
            onGraphChange={updateGraph}
            onSelectComponent={setSelectedComponentId}
          />
          <ValidationPanel validation={validation} />
          {previewContent ? <div className="mbv2-preview-compat">{previewContent}</div> : null}
        </main>
        <ComponentInspector
          graph={graph}
          selectedComponent={selectedComponent}
          onGraphChange={updateGraph}
          onDelete={(componentId) => { setGraph(deleteComponent(graph, componentId)); setSelectedComponentId(null); }}
          onDuplicate={(componentId) => {
            const result = duplicateComponent(graph, componentId);
            setGraph(result.graph);
            setSelectedComponentId(result.componentId);
          }}
        />
      </div>
    </section>
  );
}
