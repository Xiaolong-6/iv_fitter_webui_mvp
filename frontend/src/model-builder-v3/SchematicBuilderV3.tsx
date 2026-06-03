import { useEffect, useMemo, useReducer, useRef, useState, type PointerEvent, type ReactNode } from "react";
import type { Connection } from "@xyflow/react";
import { CanvasAdapterV3 } from "./canvas/CanvasAdapterV3";
import type { ModelSpec } from "../model/types";
import { compileMb3Graph } from "./domain/compile";
import { createComponentFromTemplate } from "./domain/componentFactory";
import {
  createMb3Preset,
  loadMb3Presets,
  storeMb3Presets,
  type Mb3SavedPreset,
} from "./domain/presets";
import {
  countComponentsByTemplate,
  findMb3Component,
} from "./domain/selectors";
import {
  MB3_COMPONENT_TEMPLATES,
  createMb3CustomTemplate,
  loadMb3CustomTemplates,
  storeMb3CustomTemplates,
  type Mb3ComponentTemplate,
} from "./domain/templates";
import type { Mb3Component } from "./domain/types";
import { evaluateMb3GraphConnectivity } from "./domain/validation";
import { ComponentListPanel } from "./panels/ComponentListPanel";
import { ComponentPalettePanel } from "./panels/ComponentPalettePanel";
import { InspectorPanel, type Mb3TemplateInspectorDetails } from "./panels/InspectorPanel";
import { PresetListPanel } from "./panels/PresetListPanel";
import { createMb3InitialState } from "./state/factory";
import { mb3Reducer } from "./state/reducer";
import "./styles/model-builder-v3.css";

type Mb3ListPanel = "presets" | null;

export function SchematicBuilderV3({
  model,
  onChange,
  canvasActions,
  onGoToFitting,
}: {
  model: ModelSpec;
  onChange: (model: ModelSpec) => void;
  canvasActions?: ReactNode;
  onGoToFitting?: () => void;
}) {
  const [state, dispatch] = useReducer(mb3Reducer, model, createMb3InitialState);
  const [stickySelectedComponentId, setStickySelectedComponentId] = useState<string | null>(null);
  const [previewTemplateKey, setPreviewTemplateKey] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<Mb3ListPanel>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [presets, setPresets] = useState<Mb3SavedPreset[]>(loadMb3Presets);
  const [customTemplates, setCustomTemplates] = useState<Mb3ComponentTemplate[]>(
    loadMb3CustomTemplates,
  );
  const [inspectorPosition, setInspectorPosition] = useState({ x: 14, y: 330 });
  const [inspectorAnchor, setInspectorAnchor] = useState<{ x: number; y: number } | null>(null);
  const baseModelRef = useRef(model);
  const onChangeRef = useRef(onChange);
  const inspectorDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const selectedComponent = findMb3Component(state.graph, state.selectedComponentId);
  const stickySelectedComponent = findMb3Component(state.graph, stickySelectedComponentId);
  const previewTemplate = MB3_COMPONENT_TEMPLATES.find((template) => template.key === previewTemplateKey) ?? null;
  const inspectorComponent = selectedComponent ?? stickySelectedComponent;
  const inspectorTemplateDetails: Mb3TemplateInspectorDetails | null =
    !inspectorComponent && previewTemplate
      ? {
          label: previewTemplate.label,
          behavior: previewTemplate.behavior,
          expression: previewTemplate.expression,
          parameters: previewTemplate.parameters,
        }
      : null;
  const hasInspectorDetails = Boolean(inspectorComponent || inspectorTemplateDetails);

  const onConnect = (connection: Connection, position?: { x: number; y: number }) => {
    if (!connection.source || !connection.target) return;
    dispatch({
      type: "connectPorts",
      sourceId: connection.source,
      sourceHandle: connection.sourceHandle ?? null,
      targetId: connection.target,
      targetHandle: connection.targetHandle ?? null,
      position,
    });
  };

  const usageByTemplateKey = useMemo(() => {
    return countComponentsByTemplate(state.graph, [...MB3_COMPONENT_TEMPLATES, ...customTemplates]);
  }, [state.graph.components, customTemplates]);
  const componentTemplates = useMemo(
    () => [...MB3_COMPONENT_TEMPLATES, ...customTemplates],
    [customTemplates],
  );
  const connectivityStatus = useMemo(
    () => evaluateMb3GraphConnectivity(state.graph),
    [state.graph],
  );
  const compiledGraph = useMemo(
    () => compileMb3Graph(state.graph, baseModelRef.current),
    [state.graph],
  );

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onChangeRef.current(compiledGraph.model);
  }, [compiledGraph]);

  const selectExistingComponentByTemplate = (template: Mb3ComponentTemplate, anchor: DOMRect) => {
    setPreviewTemplateKey(template.key);
    setStickySelectedComponentId(null);
    dispatch({ type: "selectComponent", componentId: null });
    setInspectorAnchor({ x: anchor.right, y: anchor.top });
    setInspectorOpen(true);
  };

  const addComponentFromTemplate = (
    template: Mb3ComponentTemplate,
    position?: { x: number; y: number },
  ) => {
    const isCustomTemplate = template.key === "custom" || template.userDefined;
    const sameType = state.graph.components.filter((component) =>
      isCustomTemplate
        ? component.templateKey === "custom" || component.templateKey?.startsWith("custom_saved_")
        : component.templateKey === template.key,
    ).length;
    const component = createComponentFromTemplate({ template, existingCount: sameType, position });
    setPreviewTemplateKey(null);
    setStickySelectedComponentId(component.id);
    dispatch({ type: "addComponent", component });
    setInspectorOpen(true);
  };

  const dropComponentTemplate = (templateKey: string, position: { x: number; y: number }) => {
    const template = componentTemplates.find((candidate) => candidate.key === templateKey);
    if (!template) return;
    addComponentFromTemplate(template, position);
  };

  const saveCustomComponentTemplate = (component: Mb3Component) => {
    if (component.templateKey !== "custom" && !component.templateKey?.startsWith("custom_saved_")) {
      return;
    }
    const suggestedName = component.label || `Custom ${customTemplates.length + 1}`;
    const label = (typeof window !== "undefined" && window.prompt ? window.prompt("Component template name", suggestedName) : suggestedName)?.trim();
    if (!label) return;
    const template = createMb3CustomTemplate({
      label,
      behavior: component.behavior,
      expression: component.expression,
      parameters: component.parameters,
    });
    const nextTemplates = [template, ...customTemplates];
    storeMb3CustomTemplates(nextTemplates);
    setCustomTemplates(nextTemplates);
  };

  const deleteCustomComponentTemplate = (template: Mb3ComponentTemplate) => {
    if (!template.userDefined) return;
    const nextTemplates = customTemplates.filter((candidate) => candidate.key !== template.key);
    storeMb3CustomTemplates(nextTemplates);
    setCustomTemplates(nextTemplates);
  };

  const saveCurrentPreset = () => {
    const suggestedName = `Preset ${presets.length + 1}`;
    const name = (typeof window !== "undefined" && window.prompt ? window.prompt("Preset name", suggestedName) : suggestedName)?.trim();
    if (!name) return;
    const preset = createMb3Preset(name, state.graph);
    const nextPresets = [preset, ...presets];
    storeMb3Presets(nextPresets);
    setPresets(nextPresets);
    setActivePanel("presets");
  };

  const loadPreset = (preset: Mb3SavedPreset) => {
    setPreviewTemplateKey(null);
    setStickySelectedComponentId(null);
    setInspectorOpen(false);
    dispatch({
      type: "hydrate",
      state: {
        graph: preset.graph,
        selectedComponentId: null,
        selectedWireId: null,
        activePresetId: preset.id,
        dirty: false,
      },
    });
  };

  const deletePreset = (preset: Mb3SavedPreset) => {
    if (preset.builtIn) return;
    const nextPresets = presets.filter((candidate) => candidate.id !== preset.id);
    storeMb3Presets(nextPresets);
    setPresets(nextPresets);
  };

  const clampInspectorPosition = (x: number, y: number) => {
    const margin = 8;
    const panelWidth = 520;
    const panelHeight = 280;
    return {
      x: Math.max(margin, Math.min(x, window.innerWidth - panelWidth - margin)),
      y: Math.max(margin, Math.min(y, window.innerHeight - panelHeight - margin)),
    };
  };

  useEffect(() => {
    if (!inspectorAnchor) return;
    const gap = 12;
    const pos = clampInspectorPosition(inspectorAnchor.x + gap, inspectorAnchor.y);
    setInspectorPosition(pos);
  }, [inspectorAnchor]);

  const startInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    inspectorDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: inspectorPosition.x,
      originY: inspectorPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = inspectorDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    setInspectorPosition(
      clampInspectorPosition(
        drag.originX + event.clientX - drag.startX,
        drag.originY + event.clientY - drag.startY,
      ),
    );
  };

  const endInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    const drag = inspectorDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    inspectorDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <section className="mbv3-shell" aria-label="Model Builder V3">
      <div className="mbv3-left-rail" onPointerDown={(event) => event.stopPropagation()}>
        <div className="mbv3-topbar">
          <div className="mbv3-title-float">
            <div className="mbv3-title-row">
              <strong>Model Builder</strong>
            </div>
          </div>
          <ComponentPalettePanel
            presetsOpen={activePanel === "presets"}
            connectivityStatus={connectivityStatus}
            onClearCanvas={() => {
              setPreviewTemplateKey(null);
              setStickySelectedComponentId(null);
              dispatch({ type: "clearCanvas" });
              setInspectorOpen(false);
            }}
            onTogglePresets={() =>
              setActivePanel((panel) => (panel === "presets" ? null : "presets"))
            }
            onSavePreset={saveCurrentPreset}
            syntheticAction={canvasActions}
            onGoToFitting={onGoToFitting}
          />
        </div>
        <ComponentListPanel
          embedded
          templates={componentTemplates}
          usageByTemplateKey={usageByTemplateKey}
          onSelectTemplate={selectExistingComponentByTemplate}
          onDeleteTemplate={deleteCustomComponentTemplate}
        />
      </div>
      {activePanel === "presets" ? (
        <PresetListPanel
          presets={presets}
          onLoadPreset={loadPreset}
          onDeletePreset={deletePreset}
        />
      ) : null}
      {inspectorOpen && hasInspectorDetails ? (
        <InspectorPanel
          component={inspectorComponent}
          templateDetails={inspectorTemplateDetails}
          position={inspectorPosition}
          onDragPointerDown={startInspectorDrag}
          onDragPointerMove={moveInspectorDrag}
          onDragPointerUp={endInspectorDrag}
          onRenameComponent={(componentId, label) =>
            dispatch({ type: "renameComponent", componentId, label })
          }
          onUpdateComponentBehavior={(componentId, behavior) =>
            dispatch({ type: "updateComponentBehavior", componentId, behavior })
          }
          onUpdateComponentExpression={(componentId, expression) =>
            dispatch({ type: "upsertComponentExpression", componentId, expression })
          }
          onAddComponentParameter={(componentId, parameter) =>
            dispatch({ type: "addComponentParameter", componentId, parameter })
          }
          onUpdateComponentParameter={(componentId, symbol, changes) =>
            dispatch({ type: "updateComponentParameter", componentId, symbol, changes })
          }
          onSaveCustomComponentTemplate={saveCustomComponentTemplate}
        />
      ) : null}
      <CanvasAdapterV3
        graph={state.graph}
        formulaLatex={compiledGraph.formulaLatex}
        formulaSections={compiledGraph.formulaSections}
        activeComponentIds={compiledGraph.activeComponentIds}
        selectedComponentId={state.selectedComponentId}
        inspectedComponentId={inspectorOpen && inspectorComponent ? inspectorComponent.id : null}
        selectedWireId={state.selectedWireId}
        onSelectComponent={(componentId, screenPos) => {
          setPreviewTemplateKey(null);
          setStickySelectedComponentId(componentId);
          dispatch({ type: "selectComponent", componentId });
          if (screenPos) {
            setInspectorAnchor(screenPos);
          }
          setInspectorOpen(Boolean(componentId));
        }}
        onSelectWire={(wireId) => {
          dispatch({ type: "selectWire", wireId });
          if (wireId) {
            setStickySelectedComponentId(null);
            setInspectorOpen(false);
          }
        }}
        onDeleteWire={(wireId) => dispatch({ type: "deleteWire", wireId })}
        onDeleteComponent={(componentId) => dispatch({ type: "deleteComponent", componentId })}
        onMoveEntity={(entityId, x, y) => dispatch({ type: "moveEntity", entityId, x, y })}
        onConnectPorts={onConnect}
        onDropTemplate={dropComponentTemplate}
      />
    </section>
  );
}
