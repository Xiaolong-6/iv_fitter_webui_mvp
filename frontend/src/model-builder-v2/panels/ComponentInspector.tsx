import type { SchematicComponent, SchematicGraph, ComponentBehavior } from "../domain/schematicTypes";
import { addParameter, removeParameter, setComponentBehavior, updateComponent, updateComponentPreset, updateParameter } from "../domain/schematicMutations";
import { behaviorEquationPrefix, behaviorLabel, componentCatalog } from "../domain/componentCatalog";
import { residualPreview, validateExpression } from "../domain/expressionValidation";

const behaviors: ComponentBehavior[] = ["R_of_V", "I_of_V", "dV_of_I", "residual"];

function parseNullableNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function parseNumber(value: string, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function ComponentInspector({
  graph,
  selectedComponent,
  onGraphChange,
  onDelete,
  onDuplicate,
}: {
  graph: SchematicGraph;
  selectedComponent: SchematicComponent | null;
  onGraphChange: (graph: SchematicGraph) => void;
  onDelete: (componentId: string) => void;
  onDuplicate: (componentId: string) => void;
}) {
  if (!selectedComponent) {
    return (
      <aside className="mbv2-inspector" aria-label="Component inspector">
        <div className="mbv2-panel-title">Inspector</div>
        <p className="mbv2-panel-help">Select a component to edit its R(V), I(V), ΔV(I), or residual expression. Select a wire to delete it.</p>
        <div className="mbv2-empty-state">Only items connected between V and GND enter the compiled model. Disconnected items remain on the canvas but are ignored.</div>
      </aside>
    );
  }
  const validation = validateExpression(selectedComponent.expression, selectedComponent.behavior, selectedComponent.parameters);
  return (
    <aside className="mbv2-inspector" aria-label="Component inspector">
      <div className="mbv2-panel-title">Selected component</div>
      <label className="mbv2-field">
        <span>Name</span>
        <input value={selectedComponent.label} onChange={(event) => onGraphChange(updateComponent(graph, selectedComponent.id, { label: event.target.value }))} />
      </label>
      <label className="mbv2-field">
        <span>Behavior</span>
        <select value={selectedComponent.behavior} onChange={(event) => onGraphChange(setComponentBehavior(graph, selectedComponent.id, event.target.value as ComponentBehavior))}>
          {behaviors.map((behavior) => <option key={behavior} value={behavior}>{behaviorLabel(behavior)}</option>)}
        </select>
      </label>
      <label className="mbv2-field">
        <span>Preset</span>
        <select value={selectedComponent.presetId} onChange={(event) => onGraphChange(updateComponentPreset(graph, selectedComponent.id, event.target.value))}>
          {componentCatalog.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
        </select>
      </label>
      <label className="mbv2-field">
        <span>Sign / polarity</span>
        <select value={String(selectedComponent.sign)} onChange={(event) => onGraphChange(updateComponent(graph, selectedComponent.id, { sign: event.target.value === "-1" ? -1 : 1 }))}>
          <option value="1">Forward</option>
          <option value="-1">Reverse</option>
        </select>
      </label>
      <div className="mbv2-expression-card">
        <div className="mbv2-expression-head">
          <span>{behaviorEquationPrefix(selectedComponent.behavior)}</span>
          <code>V = local voltage, I = local current</code>
        </div>
        <textarea value={selectedComponent.expression} onChange={(event) => onGraphChange(updateComponent(graph, selectedComponent.id, { expression: event.target.value }))} rows={4} />
        <div className="mbv2-residual-preview">Solver residual: <code>{residualPreview(selectedComponent.behavior, selectedComponent.expression)}</code></div>
        {!validation.ok ? <div className="mbv2-validation-error">{validation.errors.join(" ")}</div> : null}
        {validation.warnings.map((warning) => <div key={warning} className="mbv2-validation-warning">{warning}</div>)}
      </div>
      <div className="mbv2-parameter-head">
        <span>Parameters</span>
        <button type="button" onClick={() => onGraphChange(addParameter(graph, selectedComponent.id))}>+ Parameter</button>
      </div>
      <div className="mbv2-parameter-table">
        <div className="mbv2-param-row mbv2-param-header"><span>Symbol</span><span>Value</span><span>Lower</span><span>Upper</span><span>Fit</span><span /></div>
        {selectedComponent.parameters.map((parameter) => (
          <div key={parameter.id} className="mbv2-param-row">
            <input value={parameter.symbol} onChange={(event) => onGraphChange(updateParameter(graph, selectedComponent.id, parameter.id, { symbol: event.target.value }))} />
            <input value={String(parameter.value)} onChange={(event) => onGraphChange(updateParameter(graph, selectedComponent.id, parameter.id, { value: parseNumber(event.target.value, parameter.value) }))} />
            <input value={parameter.lower ?? ""} onChange={(event) => onGraphChange(updateParameter(graph, selectedComponent.id, parameter.id, { lower: parseNullableNumber(event.target.value) }))} />
            <input value={parameter.upper ?? ""} onChange={(event) => onGraphChange(updateParameter(graph, selectedComponent.id, parameter.id, { upper: parseNullableNumber(event.target.value) }))} />
            <input type="checkbox" checked={parameter.fit} onChange={(event) => onGraphChange(updateParameter(graph, selectedComponent.id, parameter.id, { fit: event.target.checked }))} />
            <button type="button" onClick={() => onGraphChange(removeParameter(graph, selectedComponent.id, parameter.id))}>×</button>
          </div>
        ))}
      </div>
      <div className="mbv2-inspector-actions">
        <button type="button" onClick={() => onDuplicate(selectedComponent.id)}>Duplicate</button>
        <button type="button" className="danger" onClick={() => onDelete(selectedComponent.id)}>Delete</button>
      </div>
    </aside>
  );
}
