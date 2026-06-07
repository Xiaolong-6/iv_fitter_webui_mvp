import { Fragment, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";
import { MathFormula } from "../../components/MathFormula";
import type { Mb3Behavior, Mb3FormulaSection } from "../domain/types";
import type { FloatingPosition, FloatingSize } from "./previewStorage";
import { PreviewFlyoutPanel } from "./PreviewChrome";
import type { PreviewComponentTemplate, PreviewParameter, PreviewPreset } from "./canvasState";

export type PreviewCanvasComponent = PreviewComponentTemplate & {
  id: string;
  label: string;
};

export function PreviewComponentsPanel({ templates, countsByName, onDragStart, onDragEnd, onSelectTemplate, onDeleteCustom }: {
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

function ParamNumberInput({ value, onChange }: { value: number | null | undefined; onChange: (value: number | null) => void }) {
  return <input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value === "" ? null : Number(event.target.value))} />;
}

export function PreviewInspectorPanel({ component, templateMode, position, onStartDrag, onPatch, onDuplicate, onSaveAsComponent, onAddTemplate, onAddParameter }: {
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

export function PreviewPresetsPanel({ position, size, pinned, onTogglePinned, presets, onStartDrag, onStartResize, onLoadPreset, onDeletePreset }: {
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

export function PreviewSyntheticPanel({ position, size, pinned, onTogglePinned, syntheticTool, onStartDrag, onStartResize }: {
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

export function PreviewEquationsPanel({ position, size, pinned, onTogglePinned, sections, warnings, onStartDrag, onStartResize }: {
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
