import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
  type CSSProperties,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Mb3Behavior } from "../domain/types";
import type { Mb3FormulaSection } from "../domain/types";
import { MathFormula } from "../../components/MathFormula";
import {
  BUILT_IN_PRESETS,
  DEFAULT_COMPONENT_TEMPLATES,
  cloneTemplate,
  emptyCanvasState,
  templateByName,
  type PreviewCanvasNode,
  type PreviewCanvasState,
  type PreviewComponentTemplate,
  type PreviewParameter,
  type PreviewPreset,
} from "./canvasState";
import "../styles/preview-canvas.css";

type PreviewCanvasComponent = PreviewComponentTemplate & {
  id: string;
  label: string;
};

type PreviewBoxRect = { x: number; y: number; width: number; height: number };
type CircuitStatus = { connected: boolean; activeWireCount: number; warnings: string[] };
type FloatingPosition = { x: number; y: number };
type FloatingSize = { width: number; height: number };
type FlyoutKind = "components" | "presets" | "synthetic" | "examine";
type FlyoutState = { kind: FlyoutKind; position: FloatingPosition; size: FloatingSize; pinned: boolean } | null;

type PreviewCanvasProps = {
  onCanvasStateChange?: (state: PreviewCanvasState) => void;
  onGoToFitting?: () => void;
  syntheticTool?: ReactNode;
  formulaSections?: Mb3FormulaSection[];
  compileWarnings?: string[];
  activeWireIds?: string[];
};

const LAYOUT_STORAGE_KEY = "ivfitter.modelBuilder.preview.layout";
const PRESET_STORAGE_KEY = "ivfitter.modelBuilder.preview.savedPresets";
const CUSTOM_COMPONENT_STORAGE_KEY = "ivfitter.modelBuilder.preview.customComponents";

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function cloneState(state: PreviewCanvasState): PreviewCanvasState {
  return JSON.parse(JSON.stringify(state)) as PreviewCanvasState;
}

function clampPosition(pos: FloatingPosition, size: { width: number; height: number }, bounds: DOMRect): FloatingPosition {
  const pad = 8;
  return {
    x: Math.max(pad, Math.min(pos.x, bounds.width - size.width - pad)),
    y: Math.max(pad, Math.min(pos.y, bounds.height - size.height - pad)),
  };
}

function templateFromComponent(component: PreviewCanvasComponent): PreviewComponentTemplate {
  return {
    key: `custom-${Date.now()}`,
    name: component.label || component.name,
    templateKey: component.templateKey || "custom",
    behavior: component.behavior,
    expression: component.expression,
    prefix: "C",
    system: false,
    parameters: component.parameters.map((param) => ({ ...param })),
  };
}

function ToolIcon({ name }: { name: "fit" | "delete" | "clear" | "components" | "presets" | "save" | "iv" | "duplicate" }) {
  if (name === "fit") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" /><path d="M9 9h6v6H9z" /></svg>;
  if (name === "delete") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v10M12 8v10M16 8v10" /><path d="M5 6h14M10 4h4l1 2H9l1-2Z" /><path d="M7 6l1 15h8l1-15" /></svg>;
  if (name === "clear") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17l4 4 10-10" /><path d="M4 6h16" /><path d="M4 10h10" /></svg>;
  if (name === "components") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h7v7H6zM15 6h3v3M15 12h3v3M6 16h12" /></svg>;
  if (name === "presets") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v5H5zM5 14h14v5H5z" /><path d="M8 7.5h8M8 16.5h8" /></svg>;
  if (name === "save") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h12l2 2v12H5z" /><path d="M8 5v6h8V5" /><path d="M8 17h8" /></svg>;
  if (name === "duplicate") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v10H8z" /><path d="M6 16H5a1 1 0 0 1-1-1V5h10v1" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V6M9 18V6" /><path d="M13 6l3 12 3-12" /></svg>;
}

function PreviewToolButton({ icon, label, title, onClick, className = "" }: {
  icon: "fit" | "delete" | "clear" | "components" | "presets" | "save" | "iv" | "duplicate";
  label: string;
  title: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return <button type="button" className={`mb-preview-tool-btn ${className}`} title={title} onClick={onClick}><ToolIcon name={icon} /><span>{label}</span></button>;
}

function PreviewComponentsPanel({ templates, countsByName, onDragStart, onDragEnd, onSelectTemplate, onDeleteCustom }: {
  templates: PreviewComponentTemplate[];
  countsByName: Map<string, number>;
  onDragStart: (template: PreviewComponentTemplate, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
  onSelectTemplate: (template: PreviewComponentTemplate, event: MouseEvent<HTMLDivElement>) => void;
  onDeleteCustom: (template: PreviewComponentTemplate) => void;
}) {
  return (
    <div className="mb-preview-components" aria-label="Components">
      {templates.map((template) => {
        const count = countsByName.get(template.name) ?? 0;
        return (
          <div key={template.key} className="mb-preview-list-item is-draggable" draggable onClick={(event) => onSelectTemplate(template, event)} onDragStart={(event) => onDragStart(template, event)} onDragEnd={onDragEnd}>
            <span>{template.name}</span>
            <small>{count > 0 ? `${count} added` : "not added"}</small>
            {!template.system ? <button type="button" className="mb-preview-item-delete" onClick={(event) => { event.stopPropagation(); onDeleteCustom(template); }}>x</button> : null}
          </div>
        );
      })}
    </div>
  );
}

function PreviewToolbar({ circuitStatus, onFitScreen, onDeleteSelected, onClearCanvas, onToggleComponents, onTogglePresets, onSaveLayout, onToggleSynthetic, onToggleExamine, onGoToFitting }: {
  circuitStatus: CircuitStatus;
  onFitScreen: () => void;
  onDeleteSelected: () => void;
  onClearCanvas: () => void;
  onToggleComponents: (event: MouseEvent<HTMLButtonElement>) => void;
  onTogglePresets: (event: MouseEvent<HTMLButtonElement>) => void;
  onSaveLayout: () => void;
  onToggleSynthetic: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleExamine: (event: MouseEvent<HTMLButtonElement>) => void;
  onGoToFitting?: () => void;
}) {
  const goTitle = circuitStatus.connected ? `V to GND path detected. ${circuitStatus.activeWireCount} active wire(s).` : (circuitStatus.warnings[0] || "No complete V to GND path yet.");
  return (
    <div className="mb-preview-toolbar" aria-label="Model Builder tools">
      <div className="mb-preview-title-card"><strong>Model Builder</strong></div>
      <div className="mb-preview-tool-stack">
        <span className="mb-preview-tool-group">View</span>
        <PreviewToolButton icon="fit" label="Fit view" title="Fit canvas to visible content" onClick={onFitScreen} />
        <span className="mb-preview-tool-group">Edit</span>
        <PreviewToolButton icon="delete" label="Delete selected" title="Delete selected line or box" onClick={onDeleteSelected} />
        <PreviewToolButton icon="clear" label="Clear model" title="Clear model" onClick={onClearCanvas} />
        <span className="mb-preview-tool-group">Model</span>
        <PreviewToolButton icon="components" label="Component" title="Show component templates" className="mb-preview-flyout-toggle mb-preview-components-toggle" onClick={onToggleComponents} />
        <PreviewToolButton icon="presets" label="Model presets" title="Show preset models" className="mb-preview-flyout-toggle mb-preview-presets-toggle" onClick={onTogglePresets} />
        <PreviewToolButton icon="save" label="Save model" title="Save model" onClick={onSaveLayout} />
        <PreviewToolButton icon="iv" label="Simulate IV" title="Simulate IV trace" className="mb-preview-flyout-toggle mb-preview-synthetic-toggle" onClick={onToggleSynthetic} />
        <PreviewToolButton icon="fit" label="Validate model" title="Validate model and inspect fitting equations" className="mb-preview-flyout-toggle mb-preview-examine-toggle" onClick={onToggleExamine} />
        <span className="mb-preview-tool-group">Next</span>
        <button type="button" className={`mb-preview-go ${circuitStatus.connected ? "is-connected" : "is-disconnected"}`} title={goTitle} onClick={onGoToFitting}>Use model for fitting</button>
      </div>
    </div>
  );
}

function ParamNumberInput({ value, onChange }: { value: number | null | undefined; onChange: (value: number | null) => void }) {
  return <input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
}

function PreviewInspectorPanel({ component, templateMode, position, onStartDrag, onPatch, onDuplicate, onSaveAsComponent, onAddTemplate, onAddParameter }: {
  component: PreviewCanvasComponent | null;
  templateMode: boolean;
  position: FloatingPosition | null;
  onStartDrag: (event: PointerEvent<HTMLSpanElement>) => void;
  onPatch: (patch: Partial<PreviewCanvasComponent>) => void;
  onDuplicate: () => void;
  onSaveAsComponent: () => void;
  onAddTemplate: () => void;
  onAddParameter: () => void;
}) {
  if (!component || !position) return null;
  const style: CSSProperties = { left: position.x, top: position.y };
  const updateParam = (index: number, patch: Partial<PreviewParameter>) => {
    const parameters = component.parameters.map((param, i) => i === index ? { ...param, ...patch } : param);
    onPatch({ parameters });
  };
  return (
    <aside className="mb-preview-panel mb-preview-inspector is-contextual" aria-label="Inspector" style={style}>
      <div className="mb-preview-panel-head">
        <strong>Inspector</strong>
        <span className="mb-preview-inspector-grip" aria-hidden="true" onPointerDown={onStartDrag}>::</span>
      </div>
      <div className="mb-preview-inspector-actions">
        {templateMode ? <button type="button" onClick={onAddTemplate}>Add</button> : <button type="button" onClick={onDuplicate}>Duplicate</button>}
        <button type="button" onClick={onSaveAsComponent}>Save to components</button>
      </div>
      <label><span>Name</span><input value={component.label} onChange={(event) => onPatch({ label: event.target.value })} /></label>
      <label>
        <span>Behavior</span>
        <select value={component.behavior} onChange={(event) => onPatch({ behavior: event.target.value as Mb3Behavior })}>
          <option value="I_of_V">I(V)</option>
          <option value="R_of_V">R(V)</option>
          <option value="dV_of_I">Delta V(I)</option>
          <option value="residual">Residual</option>
        </select>
      </label>
      <label><span>Expression</span><textarea value={component.expression} onChange={(event) => onPatch({ expression: event.target.value })} /></label>
      <div className="mb-preview-param-head"><strong>Parameters</strong><button type="button" onClick={onAddParameter}>+ Parameter</button></div>
      <div className="mb-preview-param-grid">
        <span>Symbol</span><span>Initial</span><span>Unit</span><span>Lower</span><span>Upper</span><span>Fit</span>
        {component.parameters.map((param, index) => (
          <Fragment key={`${param.symbol || "param"}-${index}`}>
            <input key={`${param.symbol}-symbol`} value={param.symbol} onChange={(event) => updateParam(index, { symbol: event.target.value })} />
            <ParamNumberInput key={`${param.symbol}-value`} value={param.value} onChange={(value) => updateParam(index, { value: value ?? 0 })} />
            <input key={`${param.symbol}-unit`} value={param.unit ?? ""} onChange={(event) => updateParam(index, { unit: event.target.value })} />
            <ParamNumberInput key={`${param.symbol}-lower`} value={param.lower} onChange={(value) => updateParam(index, { lower: value })} />
            <ParamNumberInput key={`${param.symbol}-upper`} value={param.upper} onChange={(value) => updateParam(index, { upper: value })} />
            <input key={`${param.symbol}-fit`} type="checkbox" checked={param.fit} onChange={(event) => updateParam(index, { fit: event.target.checked })} />
          </Fragment>
        ))}
      </div>
    </aside>
  );
}

function PreviewFlyoutPanel({ position, size, title, className = "", pinned, onTogglePinned, onStartDrag, onStartResize, children }: {
  position: FloatingPosition;
  size: FloatingSize;
  title: string;
  className?: string;
  pinned: boolean;
  onTogglePinned: () => void;
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: PointerEvent<HTMLSpanElement>) => void;
  children: ReactNode;
}) {
  return (
    <aside className={`mb-preview-panel mb-preview-flyout ${className}`} aria-label={title} style={{ left: position.x, top: position.y, width: size.width, height: size.height }}>
      <div className="mb-preview-flyout-head" onPointerDown={onStartDrag}>
        <strong>{title}</strong>
        <div className="mb-preview-flyout-controls">
          <button type="button" className={`mb-preview-pin ${pinned ? "is-pinned" : ""}`} title={pinned ? "Unpin panel" : "Pin panel"} aria-pressed={pinned} onClick={(event) => { event.stopPropagation(); onTogglePinned(); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6M9 9l6 6M15 5l-6 6-4 1 1-4 6-6M5 19l5-5" /></svg>
          </button>
          <span aria-hidden="true">::</span>
        </div>
      </div>
      <div className="mb-preview-flyout-body">{children}</div>
      <span className="mb-preview-resize-handle" aria-hidden="true" onPointerDown={onStartResize} />
    </aside>
  );
}

function PreviewPresetsPanel({ position, size, pinned, onTogglePinned, presets, onStartDrag, onStartResize, onLoadPreset, onDeletePreset }: {
  position: FloatingPosition;
  size: FloatingSize;
  pinned: boolean;
  onTogglePinned: () => void;
  presets: PreviewPreset[];
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: PointerEvent<HTMLSpanElement>) => void;
  onLoadPreset: (preset: PreviewPreset) => void;
  onDeletePreset: (preset: PreviewPreset) => void;
}) {
  return (
    <PreviewFlyoutPanel position={position} size={size} title="Presets" className="mb-preview-presets" pinned={pinned} onTogglePinned={onTogglePinned} onStartDrag={onStartDrag} onStartResize={onStartResize}>
      {presets.map((preset) => (
        <div key={preset.id} className="mb-preview-list-item mb-preview-preset-item" onClick={() => onLoadPreset(preset)}>
          <span>{preset.name}</span>
          <small>{preset.label}</small>
          {!preset.system ? <button type="button" className="mb-preview-item-delete" onClick={(event) => { event.stopPropagation(); onDeletePreset(preset); }}>x</button> : null}
        </div>
      ))}
    </PreviewFlyoutPanel>
  );
}

function PreviewSyntheticPanel({ position, size, pinned, onTogglePinned, syntheticTool, onStartDrag, onStartResize }: {
  position: FloatingPosition;
  size: FloatingSize;
  pinned: boolean;
  onTogglePinned: () => void;
  syntheticTool?: ReactNode;
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: PointerEvent<HTMLSpanElement>) => void;
}) {
  return (
    <PreviewFlyoutPanel position={position} size={size} title="Synthetic IV" className="mb-preview-synthetic" pinned={pinned} onTogglePinned={onTogglePinned} onStartDrag={onStartDrag} onStartResize={onStartResize}>
      {syntheticTool ? (
        <div className="mb-preview-synthetic-inline">{syntheticTool}</div>
      ) : (
        <p className="mb-preview-flyout-copy">Synthetic IV trace is unavailable for the current model.</p>
      )}
    </PreviewFlyoutPanel>
  );
}

function PreviewEquationsPanel({ position, size, pinned, onTogglePinned, sections, warnings, onStartDrag, onStartResize }: {
  position: FloatingPosition;
  size: FloatingSize;
  pinned: boolean;
  onTogglePinned: () => void;
  sections: Mb3FormulaSection[];
  warnings: string[];
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: PointerEvent<HTMLSpanElement>) => void;
}) {
  if (!sections.length && !warnings.length) return null;
  return (
    <PreviewFlyoutPanel position={position} size={size} title="Examine" className="mb-preview-equations" pinned={pinned} onTogglePinned={onTogglePinned} onStartDrag={onStartDrag} onStartResize={onStartResize}>
      <h2>Fitting equations</h2>
      {warnings.length ? (
        <div className="mb-preview-equation-warning">
          {warnings.map((warning) => <p key={warning}>{warning}</p>)}
        </div>
      ) : null}
      {sections.map((section) => (
        <section key={section.title} className="mb-preview-equation-section">
          <h3>{section.title}</h3>
          {section.lines.map((line, index) => line.kind === "formula"
            ? <MathFormula key={`${section.title}-${index}`} latex={line.text} />
            : <p key={`${section.title}-${index}`}>{line.text}</p>)}
        </section>
      ))}
    </PreviewFlyoutPanel>
  );
}

function nodeToComponent(node: PreviewCanvasNode, templates: PreviewComponentTemplate[]): PreviewCanvasComponent {
  const template = templateByName(templates, node.templateName);
  return {
    ...template,
    id: node.id,
    label: node.label,
    behavior: (node.behavior || template.behavior) as Mb3Behavior,
    expression: node.expression || template.expression,
    parameters: node.parameters?.length ? node.parameters.map((param) => ({ ...param })) : template.parameters.map((param) => ({ ...param })),
  };
}

export function PreviewCanvas({ onCanvasStateChange, onGoToFitting, syntheticTool, formulaSections = [], compileWarnings = [], activeWireIds = [] }: PreviewCanvasProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const draggedTemplateRef = useRef<PreviewComponentTemplate | null>(null);
  const inspectorDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const flyoutDragRef = useRef<{ dx: number; dy: number } | null>(null);
  const flyoutResizeRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [canvasState, setCanvasState] = useState<PreviewCanvasState>(() => readJson(LAYOUT_STORAGE_KEY, emptyCanvasState()));
  const [customTemplates, setCustomTemplates] = useState<PreviewComponentTemplate[]>(() => readJson(CUSTOM_COMPONENT_STORAGE_KEY, []));
  const [savedPresets, setSavedPresets] = useState<PreviewPreset[]>(() => readJson(PRESET_STORAGE_KEY, []));
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [templatePreview, setTemplatePreview] = useState<PreviewComponentTemplate | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<FloatingPosition | null>(null);
  const [flyout, setFlyout] = useState<FlyoutState>(null);
  const [circuitStatus, setCircuitStatus] = useState<CircuitStatus>({ connected: false, activeWireCount: 0, warnings: ["No complete V to GND path yet."] });

  const templates = useMemo(() => [...DEFAULT_COMPONENT_TEMPLATES, ...customTemplates], [customTemplates]);
  const presets = useMemo(() => [...BUILT_IN_PRESETS, ...savedPresets], [savedPresets]);
  const selectedNode = useMemo(() => canvasState.nodes.find((node) => node.id === selectedComponentId && !node.terminal) ?? null, [canvasState, selectedComponentId]);
  const selectedComponent = useMemo(() => templatePreview ? { ...cloneTemplate(templatePreview), id: `template:${templatePreview.key}`, label: templatePreview.name } : (selectedNode ? nodeToComponent(selectedNode, templates) : null), [selectedNode, templatePreview, templates]);
  const countsByName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of canvasState.nodes) if (!node.terminal) counts.set(node.templateName || node.label, (counts.get(node.templateName || node.label) ?? 0) + 1);
    return counts;
  }, [canvasState]);
  const postToIframe = useCallback((message: Record<string, unknown>) => frameRef.current?.contentWindow?.postMessage(message, window.location.origin), []);

  useEffect(() => {
    postToIframe({ type: "ivfitter:set-active-wires", activeWireIds });
  }, [activeWireIds, postToIframe]);

  const loadCanvasState = useCallback((state: PreviewCanvasState) => {
    const next = cloneState(state);
    setCanvasState(next);
    setSelectedComponentId(null);
    setTemplatePreview(null);
    setInspectorPosition(null);
    postToIframe({ type: "ivfitter:load-canvas-state", state: next });
  }, [postToIframe]);

  const hideFloatingMenus = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (flyout?.pinned) return;
    if (!target.closest(".mb-preview-flyout") && !target.closest(".mb-preview-flyout-toggle")) setFlyout(null);
  }, [flyout?.pinned]);

  useEffect(() => {
    onCanvasStateChange?.(canvasState);
    writeJson(LAYOUT_STORAGE_KEY, canvasState);
  }, [canvasState, onCanvasStateChange]);

  useEffect(() => writeJson(CUSTOM_COMPONENT_STORAGE_KEY, customTemplates), [customTemplates]);
  useEffect(() => writeJson(PRESET_STORAGE_KEY, savedPresets), [savedPresets]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const data = event.data;
      if (!data?.type) return;
      if (data.type === "ivfitter:preview-state-changed") {
        setCanvasState(data.state as PreviewCanvasState);
        return;
      }
      if (data.type === "ivfitter:preview-circuit-status") {
        const connected = Boolean(data.connected);
        setCircuitStatus({ connected, activeWireCount: Number(data.activeWireCount ?? 0), warnings: connected ? [] : ["No complete V to GND path yet."] });
        return;
      }
      if (data.type === "ivfitter:preview-selection-cleared") {
        setSelectedComponentId(null);
        setTemplatePreview(null);
        setInspectorPosition(null);
        return;
      }
      if (data.type === "ivfitter:preview-component-deleted") {
        setSelectedComponentId(null);
        setTemplatePreview(null);
        setInspectorPosition(null);
        return;
      }
      if (data.type === "ivfitter:preview-component-added") {
        setSelectedComponentId(null);
        setTemplatePreview(null);
        setInspectorPosition(null);
        return;
      }
      if (data.type === "ivfitter:preview-component-selected") {
        const component = data.component as PreviewCanvasComponent | undefined;
        if (!component?.id) return;
        setSelectedComponentId(String(component.id));
        setTemplatePreview(null);
        const shellRect = shellRef.current?.getBoundingClientRect();
        const rect = data.rect as PreviewBoxRect | undefined;
        if (shellRect && rect) {
          const rightSide = rect.x + rect.width + 12;
          const leftSide = Math.max(8, rect.x - 432);
          const x = rightSide + 420 < shellRect.width ? rightSide : leftSide;
          const y = rect.y + 420 < shellRect.height ? rect.y : Math.max(8, rect.y + rect.height - 420);
          setInspectorPosition(clampPosition({ x, y }, { width: 420, height: 420 }, shellRect));
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const sendInitialState = () => postToIframe({ type: "ivfitter:load-canvas-state", state: canvasState });
    frame.addEventListener("load", sendInitialState);
    return () => frame.removeEventListener("load", sendInitialState);
  }, [canvasState, postToIframe]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const active = document.activeElement;
      if (active && ["INPUT", "TEXTAREA", "SELECT"].includes(active.tagName)) return;
      postToIframe({ type: "ivfitter:delete-selected" });
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [postToIframe]);

  useEffect(() => {
    function moveInspector(event: globalThis.PointerEvent) {
      if (!inspectorDragRef.current || !shellRef.current) return;
      const shellRect = shellRef.current.getBoundingClientRect();
      setInspectorPosition(clampPosition({ x: event.clientX - shellRect.left - inspectorDragRef.current.dx, y: event.clientY - shellRect.top - inspectorDragRef.current.dy }, { width: 420, height: 420 }, shellRect));
    }
    function stopInspectorDrag() { inspectorDragRef.current = null; }
    window.addEventListener("pointermove", moveInspector);
    window.addEventListener("pointerup", stopInspectorDrag);
    window.addEventListener("pointercancel", stopInspectorDrag);
    return () => {
      window.removeEventListener("pointermove", moveInspector);
      window.removeEventListener("pointerup", stopInspectorDrag);
      window.removeEventListener("pointercancel", stopInspectorDrag);
    };
  }, []);

  useEffect(() => {
    function moveFlyout(event: globalThis.PointerEvent) {
      const shellRect = shellRef.current?.getBoundingClientRect();
      if (!shellRect) return;

      if (flyoutDragRef.current) {
        setFlyout((prev) => prev ? {
          ...prev,
          position: clampPosition(
            { x: event.clientX - shellRect.left - flyoutDragRef.current!.dx, y: event.clientY - shellRect.top - flyoutDragRef.current!.dy },
            prev.size,
            shellRect,
          ),
        } : prev);
        return;
      }

      if (flyoutResizeRef.current) {
        setFlyout((prev) => {
          if (!prev) return prev;
          const width = Math.max(220, Math.min(shellRect.width - prev.position.x - 8, flyoutResizeRef.current!.width + event.clientX - flyoutResizeRef.current!.x));
          const height = Math.max(180, Math.min(shellRect.height - prev.position.y - 8, flyoutResizeRef.current!.height + event.clientY - flyoutResizeRef.current!.y));
          return { ...prev, size: { width, height } };
        });
      }
    }

    function stopFlyoutEdit() {
      flyoutDragRef.current = null;
      flyoutResizeRef.current = null;
    }

    window.addEventListener("pointermove", moveFlyout);
    window.addEventListener("pointerup", stopFlyoutEdit);
    window.addEventListener("pointercancel", stopFlyoutEdit);
    return () => {
      window.removeEventListener("pointermove", moveFlyout);
      window.removeEventListener("pointerup", stopFlyoutEdit);
      window.removeEventListener("pointercancel", stopFlyoutEdit);
    };
  }, []);

  const startComponentDrag = (template: PreviewComponentTemplate, event: DragEvent<HTMLDivElement>) => {
    draggedTemplateRef.current = template;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", template.name);
  };

  const finishComponentDrag = (event: DragEvent<HTMLDivElement>) => {
    const template = draggedTemplateRef.current;
    draggedTemplateRef.current = null;
    const frame = frameRef.current;
    if (!template || !frame) return;
    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;
    postToIframe({ type: "ivfitter:add-preview-component", label: template.name, behavior: template.behavior, expression: template.expression, parameters: template.parameters, x, y });
  };

  const toggleFlyout = (kind: FlyoutKind, event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) return;
    if (flyout?.kind === kind) { setFlyout(null); return; }
    const rect = event.currentTarget.getBoundingClientRect();
    const width = kind === "examine" ? 560 : (kind === "synthetic" ? 520 : (kind === "components" ? 320 : 340));
    const height = kind === "examine" ? 640 : (kind === "synthetic" ? 640 : (kind === "components" ? 420 : 380));
    setFlyout({
      kind,
      position: clampPosition({ x: rect.right - shellRect.left + 8, y: rect.top - shellRect.top }, { width, height }, shellRect),
      size: { width, height },
      pinned: false,
    });
  };

  const toggleFlyoutPinned = () => {
    setFlyout((prev) => prev ? { ...prev, pinned: !prev.pinned } : prev);
  };

  const startFlyoutDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!flyout || !shellRef.current) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, textarea, select, .mb-preview-resize-handle")) return;
    event.preventDefault();
    event.stopPropagation();
    const shellRect = shellRef.current.getBoundingClientRect();
    flyoutDragRef.current = {
      dx: event.clientX - shellRect.left - flyout.position.x,
      dy: event.clientY - shellRect.top - flyout.position.y,
    };
  };

  const startFlyoutResize = (event: PointerEvent<HTMLSpanElement>) => {
    if (!flyout) return;
    event.preventDefault();
    event.stopPropagation();
    flyoutResizeRef.current = { x: event.clientX, y: event.clientY, width: flyout.size.width, height: flyout.size.height };
  };

  const startInspectorDrag = (event: PointerEvent<HTMLSpanElement>) => {
    if (!inspectorPosition) return;
    event.preventDefault();
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) return;
    inspectorDragRef.current = { dx: event.clientX - shellRect.left - inspectorPosition.x, dy: event.clientY - shellRect.top - inspectorPosition.y };
  };

  const patchInspectorComponent = (patch: Partial<PreviewCanvasComponent>) => {
    if (!selectedComponent) return;
    const next = { ...selectedComponent, ...patch };
    if (templatePreview) {
      setTemplatePreview({ ...next, name: next.label, key: templatePreview.key, prefix: templatePreview.prefix });
      return;
    }
    postToIframe({ type: "ivfitter:update-component", component: next });
  };

  const addTemplateToCanvas = () => {
    if (!templatePreview) return;
    postToIframe({ type: "ivfitter:add-preview-component", label: templatePreview.name, behavior: templatePreview.behavior, expression: templatePreview.expression, parameters: templatePreview.parameters, x: 520, y: 260 });
  };

  const saveLayout = () => {
    const name = window.prompt("Preset name", "Saved layout");
    if (!name?.trim()) return;
    const preset: PreviewPreset = { id: `saved-${Date.now()}`, name: name.trim(), label: "Saved", system: false, state: cloneState(canvasState) };
    setSavedPresets((prev) => [...prev, preset]);
    writeJson(LAYOUT_STORAGE_KEY, canvasState);
  };

  const saveAsComponent = () => {
    if (!selectedComponent) return;
    const template = templateFromComponent(selectedComponent);
    setCustomTemplates((prev) => [...prev.filter((item) => item.name !== template.name), template]);
  };

  const addParameter = () => {
    if (!selectedComponent) return;
    patchInspectorComponent({ parameters: [...selectedComponent.parameters, { symbol: `p${selectedComponent.parameters.length + 1}`, value: 1, lower: null, upper: null, fit: true, unit: "1" }] });
  };

  const selectTemplate = (template: PreviewComponentTemplate, event: MouseEvent<HTMLDivElement>) => {
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setSelectedComponentId(null);
    setTemplatePreview(cloneTemplate(template));
    setInspectorPosition(clampPosition({ x: rect.right - shellRect.left + 10, y: rect.top - shellRect.top }, { width: 420, height: 420 }, shellRect));
  };

  const effectiveCircuitStatus: CircuitStatus = {
    connected: circuitStatus.connected && compileWarnings.length === 0,
    activeWireCount: circuitStatus.activeWireCount,
    warnings: compileWarnings.length ? compileWarnings : circuitStatus.warnings,
  };

  return (
    <div ref={shellRef} className="mb-preview-shell" onPointerDownCapture={hideFloatingMenus}>
      <iframe ref={frameRef} className="mb-preview-frame" src="/model-builder-preview.html" title="Model Builder canvas" />
      <div className="mb-preview-overlay" aria-label="Model Builder overlay">
        <PreviewToolbar
          circuitStatus={effectiveCircuitStatus}
          onFitScreen={() => postToIframe({ type: "ivfitter:fit-screen" })}
          onDeleteSelected={() => postToIframe({ type: "ivfitter:delete-selected" })}
          onClearCanvas={() => loadCanvasState(emptyCanvasState())}
          onToggleComponents={(event) => toggleFlyout("components", event)}
          onTogglePresets={(event) => toggleFlyout("presets", event)}
          onSaveLayout={saveLayout}
          onToggleSynthetic={(event) => toggleFlyout("synthetic", event)}
          onToggleExamine={(event) => toggleFlyout("examine", event)}
          onGoToFitting={onGoToFitting}
        />
        {flyout?.kind === "components" ? (
          <PreviewFlyoutPanel position={flyout.position} size={flyout.size} title="Components" className="mb-preview-components-flyout" pinned={flyout.pinned} onTogglePinned={toggleFlyoutPinned} onStartDrag={startFlyoutDrag} onStartResize={startFlyoutResize}>
            <PreviewComponentsPanel
              templates={templates}
              countsByName={countsByName}
              onDragStart={startComponentDrag}
              onDragEnd={finishComponentDrag}
              onSelectTemplate={selectTemplate}
              onDeleteCustom={(template) => setCustomTemplates((prev) => prev.filter((item) => item.key !== template.key))}
            />
          </PreviewFlyoutPanel>
        ) : null}
        {flyout?.kind === "presets" ? (
          <PreviewPresetsPanel position={flyout.position} size={flyout.size} pinned={flyout.pinned} onTogglePinned={toggleFlyoutPinned} presets={presets} onStartDrag={startFlyoutDrag} onStartResize={startFlyoutResize} onLoadPreset={(preset) => { setFlyout(null); loadCanvasState(preset.state); }} onDeletePreset={(preset) => setSavedPresets((prev) => prev.filter((item) => item.id !== preset.id))} />
        ) : null}
        {flyout?.kind === "synthetic" ? (
          <PreviewSyntheticPanel position={flyout.position} size={flyout.size} pinned={flyout.pinned} onTogglePinned={toggleFlyoutPinned} syntheticTool={syntheticTool} onStartDrag={startFlyoutDrag} onStartResize={startFlyoutResize} />
        ) : null}
        {flyout?.kind === "examine" ? (
          <PreviewEquationsPanel position={flyout.position} size={flyout.size} pinned={flyout.pinned} onTogglePinned={toggleFlyoutPinned} sections={formulaSections} warnings={compileWarnings} onStartDrag={startFlyoutDrag} onStartResize={startFlyoutResize} />
        ) : null}
        <PreviewInspectorPanel
          component={selectedComponent}
          templateMode={Boolean(templatePreview)}
          position={inspectorPosition}
          onStartDrag={startInspectorDrag}
          onPatch={patchInspectorComponent}
          onDuplicate={() => postToIframe({ type: "ivfitter:duplicate-selected" })}
          onSaveAsComponent={saveAsComponent}
          onAddTemplate={addTemplateToCanvas}
          onAddParameter={addParameter}
        />
      </div>
    </div>
  );
}
