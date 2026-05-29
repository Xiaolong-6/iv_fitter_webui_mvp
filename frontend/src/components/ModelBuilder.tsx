import { useEffect, useMemo, useState } from "react";
import type {
  ComponentSpec,
  FunctionDefinition,
  Location,
  ModelSpec,
  ParameterSpec,
  Polarity,
} from "../model/types";
import {
  removeComponent,
  updateComponent,
} from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";
import { addDefinitionToModel, applyNicknameToParams, buildPendingComponent } from "../model-builder/mutations";
import { createInitialModel } from "../model/defaults";
import { allowedPolarities, bucketForComponent, builderBuckets, definitionsForBucket as bucketDefinitions, isDuplicateBlocked, nickname, type BuilderBucket, type ModelLocation } from "../model-builder/rules";
import { localizedFunctionLabel } from "../content/localizedText";
import { formatValueWithUnit } from "../model/format";

interface Props {
  model: ModelSpec;
  registry: FunctionDefinition[];
  onChange: (model: ModelSpec) => void;
  language: Language;
  disabled?: boolean;
}

type CircuitZoneName = "main" | "branches";
type ComponentRef = { location: ModelLocation; comp: ComponentSpec };

const BUILDER_PRESET_STORAGE_KEY = "ivfitter.builderCustomPresets.v1";
type BuilderPreset = { name: string; model: ModelSpec };

function cloneModelForPreset(model: ModelSpec): ModelSpec {
  return JSON.parse(JSON.stringify(model)) as ModelSpec;
}

function makeSingleDiodePreset(model: ModelSpec): ModelSpec {
  return createInitialModel(String(model.version ?? "1.7.22"));
}

function makeDoubleDiodePreset(model: ModelSpec): ModelSpec {
  const base = makeSingleDiodePreset(model);
  const primary = base.core.find((comp) => comp.function_type === "diode");
  if (!primary) return base;
  const d2 = JSON.parse(JSON.stringify(primary)) as ComponentSpec;
  return {
    ...base,
    parallel: [
      ...base.parallel,
      {
        ...d2,
        id: "D2",
        location: "parallel",
        placement: "parallel_current_branch",
        params: Object.fromEntries(
          Object.entries(d2.params).map(([key, param]) => [
            key,
            {
              ...param,
              value: key === "I0_A" ? 1e-14 : param.value,
              label: key === "I0_A" ? "I02" : param.label,
            },
          ]),
        ) as ComponentSpec["params"],
        metadata: { ...(d2.metadata ?? {}), nickname: "D2", role: "secondary" },
      },
    ],
  };
}

function readBuilderPresets(): BuilderPreset[] {
  try {
    const raw = window.localStorage.getItem(BUILDER_PRESET_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as BuilderPreset[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.name === "string" && item.model) : [];
  } catch {
    return [];
  }
}

function writeBuilderPresets(presets: BuilderPreset[]) {
  window.localStorage.setItem(BUILDER_PRESET_STORAGE_KEY, JSON.stringify(presets));
}

function componentLawLabel(comp: ComponentSpec, language: Language) {
  if (comp.law_id === "ohmic") return language === "zh" ? "欧姆定律" : "Ohmic law";
  if (comp.function_type === "series_power_law_drop") return language === "zh" ? "Softplus 压降" : "Softplus voltage drop";
  return localizedFunctionLabel(comp.function_type, comp.law_id ?? comp.function_type, language);
}

function componentDisplayName(comp: ComponentSpec, language: Language) {
  return componentLawLabel(comp, language);
}

function polarityLabel(language: Language, p: string) {
  if (p === "forward") return t(language, "forwardPolarity");
  if (p === "reverse") return t(language, "reversePolarity");
  if (p === "symmetric") return t(language, "bothPolarity");
  return p;
}

function functionOptionLabel(definition: FunctionDefinition, language: Language, bucket?: BuilderBucket) {
  const advanced = new Set([
    "series_diode_barrier",
    "softplus_rs_modifier",
    "series_power_law_drop",
    "custom",
    "power_law",
    "soft_breakdown",
    "bias_dependent_current",
    "photocurrent_voltage_dependent",
    "voltage_dependent_photocurrent",
  ]);
  const prefix = advanced.has(definition.function_type)
    ? (language === "zh" ? "高级 · " : "Advanced · ")
    : (language === "zh" ? "基础 · " : "Basic · ");
  if (definition.function_type === "series_diode_barrier") return prefix + (language === "zh" ? "类二极管串联势垒压降" : "Diode-like series barrier drop");
  if (definition.function_type === "softplus_rs_modifier") return prefix + (language === "zh" ? "偏压相关串联电导调制" : "Bias-dependent series conductance modifier");
  if (definition.function_type === "custom" && bucket === "main") return prefix + (language === "zh" ? "自定义传输调制" : "Custom transport modifier");
  if (definition.law_id === "ohmic") return prefix + (language === "zh" ? "有效欧姆电阻" : "Effective Ohmic resistance");
  return prefix + localizedFunctionLabel(definition.function_type, definition.display_name, language);
}

function zoneForComponent(comp: ComponentSpec): CircuitZoneName {
  return bucketForComponent(comp) === "main" ? "main" : "branches";
}

function findComponentRef(model: ModelSpec, componentId: string | null): ComponentRef | null {
  if (!componentId) return null;
  for (const location of ["series", "core", "parallel"] as ModelLocation[]) {
    const comp = model[location].find((item) => item.id === componentId);
    if (comp) return { location, comp };
  }
  return null;
}

function allRefsForZone(model: ModelSpec, zone: CircuitZoneName): ComponentRef[] {
  const refs: ComponentRef[] = [];
  for (const location of ["series", "core", "parallel"] as ModelLocation[]) {
    for (const comp of model[location]) {
      if (zoneForComponent(comp) === zone) refs.push({ location, comp });
    }
  }
  return refs;
}

function definitionForComponent(registry: FunctionDefinition[], comp: ComponentSpec) {
  const functionType = comp.function_type === "photocurrent_voltage_dependent" || comp.function_type === "voltage_dependent_photocurrent"
    ? "bias_dependent_current"
    : comp.function_type;
  return registry.find((definition) => definition.function_type === functionType);
}

function definitionsForBucket(registry: FunctionDefinition[], bucket: BuilderBucket) {
  return bucketDefinitions(registry, bucket);
}

function addableDefinitionForBucket(model: ModelSpec, definitions: FunctionDefinition[], bucket: BuilderBucket, selected?: string) {
  const explicit = definitions.find((item) => item.function_type === selected);
  if (explicit && definitionHasAddableVariant(model, bucket, explicit)) return explicit;
  return definitions.find((definition) => definitionHasAddableVariant(model, bucket, definition)) ?? definitions[0];
}

function addPolarityFor(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition): Polarity | undefined {
  const polarities = allowedPolarities(definition);
  if (!polarities.length) return undefined;
  const preferred = [definition.default_polarity, ...polarities].filter(Boolean) as Polarity[];
  return preferred.find((candidate) => {
    const pending = buildPendingComponent(model, bucket, definition, candidate);
    return !isDuplicateBlocked(model, pending);
  }) ?? preferred[0];
}

function definitionHasAddableVariant(model: ModelSpec, bucket: BuilderBucket, definition: FunctionDefinition) {
  const polarities = allowedPolarities(definition);
  if (!polarities.length) return !isDuplicateBlocked(model, buildPendingComponent(model, bucket, definition));
  const preferred = [definition.default_polarity, ...polarities].filter(Boolean) as Polarity[];
  return preferred.some((polarity) => !isDuplicateBlocked(model, buildPendingComponent(model, bucket, definition, polarity)));
}

function updateParameter(
  model: ModelSpec,
  location: Location,
  componentId: string,
  paramName: string,
  patch: Partial<ParameterSpec>,
) {
  const comp = model[location].find((item) => item.id === componentId);
  if (!comp || !comp.params[paramName]) return model;
  const next = {
    ...comp,
    params: {
      ...comp.params,
      [paramName]: { ...comp.params[paramName], ...patch },
    },
  };
  return updateComponent(model, location, componentId, next);
}

function compactNumber(v: number | null | undefined, _unit?: string | null) {
  return formatValueWithUnit(v, null, 4);
}

function parseOptionalNumber(text: string): number | null | undefined {
  if (text.trim() === "") return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

function NumberEdit({ value, unit, disabled, onCommit }: { value: number | null | undefined; unit?: string | null; disabled?: boolean; onCommit: (value: number | null) => void }) {
  const [draft, setDraft] = useState(compactNumber(value, unit));
  useEffect(() => setDraft(compactNumber(value, unit)), [value, unit]);
  function commit() {
    const parsed = parseOptionalNumber(draft);
    if (parsed === undefined) {
      setDraft(compactNumber(value, unit));
      return;
    }
    onCommit(parsed);
  }
  return <input
    className="parameter-edit-input circuit-param-input"
    disabled={disabled}
    value={draft}
    onChange={(event) => setDraft(event.target.value)}
    onBlur={commit}
    onKeyDown={(event) => {
      if (event.key === "Enter") commit();
      if (event.key === "Escape") setDraft(compactNumber(value, unit));
    }}
  />;
}

function CircuitNodeCard({ refItem, selected, language, onSelect, disabled, onRemove }: {
  refItem: ComponentRef;
  selected: boolean;
  language: Language;
  onSelect: () => void;
  disabled?: boolean;
  onRemove: () => void;
}) {
  const { comp } = refItem;
  const zone = zoneForComponent(comp);
  const isBranch = zone === "branches";
  const polarity = comp.polarity ? polarityLabel(language, comp.polarity) : null;
  const warning = comp.function_type === "custom" ? (language === "zh" ? "自定义" : "custom") : null;
  return <button
    type="button"
    className={`circuit-node-card ${selected ? "is-selected" : ""} circuit-zone-${zone}`}
    onClick={onSelect}
    disabled={disabled}
    aria-pressed={selected}
    title={componentDisplayName(comp, language)}
  >
    <span className="node-grip" aria-hidden="true">⋮⋮</span>
    <span className="node-main">
      <strong>{nickname(comp)}</strong>
      <small>{componentDisplayName(comp, language)}</small>
      <span className="node-badges">
        {polarity ? <span className="node-badge">{polarity}</span> : null}
        {warning ? <span className="node-badge node-badge-warning">{warning}</span> : null}
        {isBranch ? <span className="node-badge node-badge-branch">I(Vi)</span> : <span className="node-badge node-badge-main">ΔV</span>}
      </span>
    </span>
    <span
      className="node-remove"
      role="button"
      tabIndex={-1}
      aria-label={language === "zh" ? "删除元件" : "Remove component"}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onRemove();
      }}
    >×</span>
  </button>;
}

function AddComponentMenu({ bucket, registry, model, selectedDefinition, language, disabled, onDefinitionChange, onAdd }: {
  bucket: BuilderBucket;
  registry: FunctionDefinition[];
  model: ModelSpec;
  selectedDefinition?: string;
  language: Language;
  disabled?: boolean;
  onDefinitionChange: (functionType: string) => void;
  onAdd: () => void;
}) {
  const definitions = definitionsForBucket(registry, bucket);
  const definition = addableDefinitionForBucket(model, definitions, bucket, selectedDefinition);
  const pendingComponent = definition ? buildPendingComponent(model, bucket, definition, addPolarityFor(model, bucket, definition)) : null;
  const duplicateBlocked = pendingComponent ? isDuplicateBlocked(model, pendingComponent) : false;
  const duplicateReason = language === "zh"
    ? "已存在相同数学形式、位置和极性的模型项。"
    : "This law/form/placement/polarity is already present.";
  return <div className="circuit-add-menu">
    <select
      title={t(language, "functionSelectHelp")}
      disabled={disabled || !definitions.length}
      value={definition?.function_type ?? ""}
      onChange={(event) => onDefinitionChange(event.target.value)}
    >
      {definitions.map((item) => <option key={item.function_type} value={item.function_type}>{functionOptionLabel(item, language, bucket)}</option>)}
    </select>
    <button
      type="button"
      disabled={disabled || !definition || duplicateBlocked}
      title={disabled ? (language === "zh" ? "拟合运行中，暂时不能修改模型。" : "Fit is running; model edits are temporarily disabled.") : duplicateBlocked ? duplicateReason : t(language, "addComponentHelp")}
      onClick={onAdd}
    >+ {language === "zh" ? "添加" : "Add"}</button>
  </div>;
}

function CircuitWireLayer({ mainCount, branchCount }: { mainCount: number; branchCount: number }) {
  const mainWidth = Math.max(300, mainCount * 190 + 160);
  const branchWidth = Math.max(360, branchCount * 210 + 120);
  const width = Math.max(760, mainWidth, branchWidth);
  const branchStart = Math.max(260, (width - branchWidth) / 2 + 80);
  const mainStart = Math.max(190, (width - mainWidth) / 2 + 120);
  return <svg className="circuit-wire-layer" viewBox={`0 0 ${width} 420`} preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <marker id="builder-arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto" markerUnits="strokeWidth">
        <path d="M0,0 L9,4.5 L0,9 Z" className="builder-arrow" />
      </marker>
    </defs>
    <line className="builder-wire" x1="90" y1="120" x2={width - 120} y2="120" markerEnd="url(#builder-arrow)" />
    <line className="builder-wire-muted" x1={branchStart} y1="120" x2={branchStart} y2="300" />
    <line className="builder-wire-muted" x1={branchStart} y1="300" x2={width - 120} y2="300" />
    <line className="builder-wire-ground" x1="90" y1="350" x2={width - 120} y2="350" />
    <line className="builder-wire-muted" x1={width - 120} y1="120" x2={width - 120} y2="350" />
    <circle className="builder-node-dot" cx={branchStart} cy="120" r="5" />
    <circle className="builder-node-dot" cx={branchStart} cy="350" r="5" />
    <circle className="builder-node-dot" cx={width - 120} cy="120" r="6" />
    <circle className="builder-node-dot" cx={width - 120} cy="350" r="5" />
    <text className="builder-wire-label" x="55" y="126">Vext</text>
    <text className="builder-wire-label" x={width - 96} y="126">Vi</text>
    <text className="builder-wire-label" x="55" y="356">V=0</text>
    <rect className="builder-terminal" x="18" y="94" width="82" height="52" rx="8" />
    <rect className="builder-terminal" x="18" y="324" width="82" height="52" rx="8" />
    <circle className="builder-terminal-circle" cx={width - 120} cy="120" r="34" />
  </svg>;
}

function CircuitCanvas({ model, registry, selectedId, setSelectedId, selectedDefinitions, setSelectedDefinitions, onChange, language, disabled }: {
  model: ModelSpec;
  registry: FunctionDefinition[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedDefinitions: Record<string, string>;
  setSelectedDefinitions: (patch: (current: Record<string, string>) => Record<string, string>) => void;
  onChange: (model: ModelSpec) => void;
  language: Language;
  disabled?: boolean;
}) {
  const mainRefs = allRefsForZone(model, "main");
  const branchRefs = allRefsForZone(model, "branches");
  function addFrom(bucket: BuilderBucket) {
    const definitions = definitionsForBucket(registry, bucket);
    const definition = addableDefinitionForBucket(model, definitions, bucket, selectedDefinitions[bucket]);
    if (!definition) return;
    const result = addDefinitionToModel(model, bucket, definition, addPolarityFor(model, bucket, definition));
    if (!result.added) return;
    onChange(result.model);
    setSelectedId(result.component.id);
  }
  function removeRef(refItem: ComponentRef) {
    const next = removeComponent(model, refItem.location, refItem.comp.id);
    onChange(next);
    if (selectedId === refItem.comp.id) setSelectedId(null);
  }
  return <div className="equivalent-circuit-builder" data-testid="equivalent-circuit-canvas">
    <CircuitWireLayer mainCount={mainRefs.length} branchCount={branchRefs.length} />
    <div className="circuit-zone-frame circuit-main-frame">
      <div className="circuit-zone-heading">
        <strong>{language === "zh" ? "主路径" : "Main path"}</strong>
        <AddComponentMenu
          bucket="main"
          registry={registry}
          model={model}
          selectedDefinition={selectedDefinitions.main}
          language={language}
          disabled={disabled}
          onDefinitionChange={(functionType) => setSelectedDefinitions((current) => ({ ...current, main: functionType }))}
          onAdd={() => addFrom("main")}
        />
      </div>
      <div className="circuit-node-row circuit-main-row">
        {mainRefs.length ? mainRefs.map((refItem) => <CircuitNodeCard
          key={refItem.comp.id}
          refItem={refItem}
          selected={selectedId === refItem.comp.id}
          language={language}
          onSelect={() => setSelectedId(refItem.comp.id)}
          disabled={disabled}
          onRemove={() => removeRef(refItem)}
        />) : <div className="circuit-empty-slot">{language === "zh" ? "直接连接 Vext → Vi" : "Direct Vext → Vi"}</div>}
      </div>
    </div>
    <div className="circuit-zone-frame circuit-branch-frame">
      <div className="circuit-zone-heading">
        <strong>{language === "zh" ? "结点电流分支" : "Junction branches"}</strong>
        <AddComponentMenu
          bucket="branches"
          registry={registry}
          model={model}
          selectedDefinition={selectedDefinitions.branches}
          language={language}
          disabled={disabled}
          onDefinitionChange={(functionType) => setSelectedDefinitions((current) => ({ ...current, branches: functionType }))}
          onAdd={() => addFrom("branches")}
        />
      </div>
      <div className="circuit-node-row circuit-branch-row">
        {branchRefs.length ? branchRefs.map((refItem) => <CircuitNodeCard
          key={refItem.comp.id}
          refItem={refItem}
          selected={selectedId === refItem.comp.id}
          language={language}
          onSelect={() => setSelectedId(refItem.comp.id)}
          disabled={disabled}
          onRemove={() => removeRef(refItem)}
        />) : <div className="circuit-empty-slot">{language === "zh" ? "暂无电流分支" : "No current branches"}</div>}
      </div>
    </div>
  </div>;
}

function ComponentInspector({ refItem, model, registry, language, disabled, onChange }: {
  refItem: ComponentRef | null;
  model: ModelSpec;
  registry: FunctionDefinition[];
  language: Language;
  disabled?: boolean;
  onChange: (model: ModelSpec) => void;
}) {
  if (!refItem) {
    return <aside className="component-inspector empty-inspector">
      <h3>{language === "zh" ? "元件检查器" : "Component inspector"}</h3>
      <p>{language === "zh" ? "点击画布中的元件来编辑名称、参数、拟合开关和边界。" : "Select a circuit component to edit its name, parameters, fit toggles, and bounds."}</p>
    </aside>;
  }
  const { location, comp } = refItem;
  const definition = definitionForComponent(registry, comp);
  const polarities = allowedPolarities(definition);
  function nextComp(patch: Partial<ComponentSpec>) {
    onChange(updateComponent(model, location, comp.id, { ...comp, ...patch }));
  }
  function updateMetadata(patch: Record<string, unknown>) {
    nextComp({ metadata: { ...comp.metadata, ...patch } });
  }
  return <aside className="component-inspector" data-testid="component-inspector">
    <div className="inspector-title-row">
      <div>
        <h3>{nickname(comp)}</h3>
        <p>{componentDisplayName(comp, language)}</p>
      </div>
      <span className="inspector-zone-pill">{zoneForComponent(comp) === "main" ? (language === "zh" ? "主路" : "Main path") : (language === "zh" ? "分支" : "Branch")}</span>
    </div>
    <label className="inspector-field">
      <span>{language === "zh" ? "名称" : "Name"}</span>
      <input
        disabled={disabled}
        value={nickname(comp)}
        onChange={(event) => onChange(updateComponent(model, location, comp.id, applyNicknameToParams(comp, event.target.value)))}
      />
    </label>
    {polarities.length ? <label className="inspector-field">
      <span>{t(language, "polarity")}</span>
      <select
        disabled={disabled}
        value={comp.polarity ?? definition?.default_polarity ?? polarities[0]}
        onChange={(event) => nextComp({ polarity: event.target.value as Polarity })}
      >
        {polarities.map((polarity) => <option key={polarity} value={polarity}>{polarityLabel(language, polarity)}</option>)}
      </select>
    </label> : null}
    {comp.function_type === "custom" ? <label className="inspector-field">
      <span>{t(language, "expression")}</span>
      <input disabled={disabled} value={String(comp.metadata?.expression ?? "")} onChange={(event) => updateMetadata({ expression: event.target.value })} />
    </label> : null}
    <div className="inspector-section-title">{language === "zh" ? "参数" : "Parameters"}</div>
    <div className="inspector-param-table">
      <div className="inspector-param-header">
        <span>{language === "zh" ? "参数" : "Parameter"}</span>
        <span>{language === "zh" ? "初值" : "Value"}</span>
        <span>{language === "zh" ? "拟合" : "Fit"}</span>
        <span>{language === "zh" ? "下限" : "Lower"}</span>
        <span>{language === "zh" ? "上限" : "Upper"}</span>
      </div>
      {Object.entries(comp.params).map(([paramName, spec]) => <div className="inspector-param-row" key={paramName}>
        <span className="inspector-param-name" title={spec.description ?? paramName}>{spec.label ?? paramName}<small>{spec.unit ?? ""}</small></span>
        <NumberEdit disabled={disabled} value={spec.value} unit={spec.unit} onCommit={(value) => value !== null && onChange(updateParameter(model, location, comp.id, paramName, { value }))} />
        <label className="inspector-fit-toggle" title={language === "zh" ? "是否拟合该参数" : "Fit this parameter"}>
          <input disabled={disabled} type="checkbox" checked={Boolean(spec.fit)} onChange={(event) => onChange(updateParameter(model, location, comp.id, paramName, { fit: event.target.checked }))} />
        </label>
        <NumberEdit disabled={disabled} value={spec.lower ?? null} onCommit={(value) => onChange(updateParameter(model, location, comp.id, paramName, { lower: value }))} />
        <NumberEdit disabled={disabled} value={spec.upper ?? null} onCommit={(value) => onChange(updateParameter(model, location, comp.id, paramName, { upper: value }))} />
      </div>)}
    </div>
    <details className="inspector-advanced">
      <summary>{language === "zh" ? "高级：law / form / placement" : "Advanced: law / form / placement"}</summary>
      <dl>
        <dt>law_id</dt><dd>{comp.law_id ?? "—"}</dd>
        <dt>function_type</dt><dd>{comp.function_type}</dd>
        <dt>evaluation_form</dt><dd>{comp.evaluation_form ?? "—"}</dd>
        <dt>placement</dt><dd>{comp.placement ?? "—"}</dd>
        <dt>location</dt><dd>{comp.location}</dd>
      </dl>
    </details>
  </aside>;
}

function ModelPresetControls({ model, language, onChange, disabled, onAfterPreset }: { model: ModelSpec; language: Language; onChange: (model: ModelSpec) => void; disabled?: boolean; onAfterPreset: (model: ModelSpec) => void }) {
  const [customPresets, setCustomPresets] = useState<BuilderPreset[]>(() => typeof window === "undefined" ? [] : readBuilderPresets());
  const [selected, setSelected] = useState("single");
  const customOptions = useMemo(() => customPresets.map((preset, index) => ({ id: `custom:${index}`, name: preset.name })), [customPresets]);
  useEffect(() => { if (typeof window !== "undefined") writeBuilderPresets(customPresets); }, [customPresets]);
  function apply(value: string) {
    setSelected(value);
    if (disabled) return;
    let next: ModelSpec | null = null;
    if (value === "single") next = makeSingleDiodePreset(model);
    else if (value === "double") next = makeDoubleDiodePreset(model);
    else if (value.startsWith("custom:")) {
      const preset = customPresets[Number(value.split(":")[1])];
      if (preset) next = cloneModelForPreset(preset.model);
    }
    if (next) {
      onChange(next);
      onAfterPreset(next);
    }
  }
  function saveCurrent() {
    if (disabled) return;
    const name = window.prompt(language === "zh" ? "保存当前模型为：" : "Save current model as:", language === "zh" ? "自定义模型" : "Custom model");
    if (!name?.trim()) return;
    setCustomPresets((items) => [...items, { name: name.trim(), model: cloneModelForPreset(model) }]);
  }
  function renameCurrent() {
    if (!selected.startsWith("custom:")) return;
    const idx = Number(selected.split(":")[1]);
    const current = customPresets[idx];
    if (!current) return;
    const name = window.prompt(language === "zh" ? "重命名模型预设：" : "Rename model preset:", current.name);
    if (!name?.trim()) return;
    setCustomPresets((items) => items.map((item, i) => i === idx ? { ...item, name: name.trim() } : item));
  }
  function deleteCurrent() {
    if (!selected.startsWith("custom:")) return;
    const idx = Number(selected.split(":")[1]);
    const current = customPresets[idx];
    if (!current) return;
    if (!window.confirm(language === "zh" ? `删除预设 ${current.name}？` : `Delete preset ${current.name}?`)) return;
    setCustomPresets((items) => items.filter((_, i) => i !== idx));
    setSelected("single");
  }
  return <div className="model-preset-controls builder-model-preset-controls circuit-builder-presets">
    <label><span>{language === "zh" ? "预设" : "Preset"}</span><select disabled={disabled} value={selected} onChange={(event) => apply(event.target.value)} data-testid="model-preset-select"><option value="single">{language === "zh" ? "单二极管模型" : "Single diode model"}</option><option value="double">{language === "zh" ? "双二极管模型" : "Double diode model"}</option>{customOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
    <div className="model-preset-actions"><button type="button" disabled={disabled} onClick={saveCurrent}>{language === "zh" ? "保存" : "Save"}</button><button type="button" disabled={disabled || !selected.startsWith("custom:")} onClick={renameCurrent}>{language === "zh" ? "重命名" : "Rename"}</button><button type="button" disabled={disabled || !selected.startsWith("custom:")} onClick={deleteCurrent}>{language === "zh" ? "删除" : "Delete"}</button></div>
  </div>;
}

export function ModelBuilder({ model, registry, onChange, language, disabled = false }: Props) {
  const [selectedDefinitions, setSelectedDefinitions] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(() => model.series[0]?.id ?? model.core[0]?.id ?? model.parallel[0]?.id ?? null);
  const selectedRef = findComponentRef(model, selectedId);
  useEffect(() => {
    if (selectedId && findComponentRef(model, selectedId)) return;
    setSelectedId(model.series[0]?.id ?? model.core[0]?.id ?? model.parallel[0]?.id ?? null);
  }, [model, selectedId]);
  function selectFirst(next: ModelSpec) {
    setSelectedId(next.series[0]?.id ?? next.core[0]?.id ?? next.parallel[0]?.id ?? null);
  }
  const componentCount = model.series.length + model.core.length + model.parallel.length;
  return <section className="card model-builder circuit-builder-shell">
    <div className="model-sticky-summary circuit-builder-toolbar">
      <div>
        <h2>{t(language, "modelBuilder")} <HelpTip text={t(language, "modelBuilderHelp")} /></h2>
        <p className="muted">{language === "zh" ? "用等效电路画布组织模型；后端仍使用原 ModelSpec。" : "Build the model through an equivalent-circuit canvas; the backend still receives the same ModelSpec."}</p>
      </div>
      <ModelPresetControls model={model} language={language} onChange={onChange} disabled={disabled} onAfterPreset={selectFirst} />
    </div>
    <div className="circuit-builder-layout">
      <div className="circuit-builder-main">
        <CircuitCanvas
          model={model}
          registry={registry}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
          selectedDefinitions={selectedDefinitions}
          setSelectedDefinitions={setSelectedDefinitions}
          onChange={onChange}
          language={language}
          disabled={disabled}
        />
        <div className="circuit-model-summary">
          <span>{language === "zh" ? "模型元件" : "Model components"}: <strong>{componentCount}</strong></span>
          <span>{language === "zh" ? "主路" : "Main"}: {model.series.length}</span>
          <span>{language === "zh" ? "分支" : "Branches"}: {model.core.length + model.parallel.length}</span>
        </div>
      </div>
      <ComponentInspector refItem={selectedRef} model={model} registry={registry} language={language} disabled={disabled} onChange={onChange} />
    </div>
  </section>;
}
