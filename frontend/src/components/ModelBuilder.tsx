import { useState } from "react";
import type {
  ComponentSpec,
  EvaluationForm,
  FunctionDefinition,
  ModelSpec,
  ParameterSpec,
  Placement,
  Polarity,
} from "../model/types";
import {
  addComponent,
  buildParams,
  createComponentInLocation,
  removeComponent,
  updateComponent,
} from "../model/utils";
import { fmtEng } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { initialValueGuidance } from "../model/diagnostics";
import { HelpTip } from "./HelpTip";

interface Props {
  model: ModelSpec;
  registry: FunctionDefinition[];
  onChange: (model: ModelSpec) => void;
  language: Language;
}

type ModelLocation = "core" | "series" | "parallel";
type BuilderBucket = "main" | "branches";

const builderBuckets: BuilderBucket[] = ["main", "branches"];
const bucketLocations: Record<BuilderBucket, ModelLocation[]> = {
  main: ["series"],
  branches: ["core", "parallel"],
};

function bucketForComponent(comp: ComponentSpec): BuilderBucket {
  return comp.location === "series" || comp.evaluation_form === "voltage_drop" || comp.placement === "series_voltage_drop"
    ? "main"
    : "branches";
}

function nickname(comp: ComponentSpec) {
  return String(comp.metadata?.nickname ?? comp.id);
}

function componentTitle(comp: ComponentSpec, language: Language) {
  const law = comp.law_id === "ohmic" ? "Ohmic" : (comp.law_id ?? comp.function_type);
  const place = bucketForComponent(comp) === "main" ? t(language, "mainPath") : t(language, "branches");
  const pol = comp.polarity ? ` · ${t(language, "polarity")}: ${polarityLabel(language, comp.polarity)}` : "";
  return `${nickname(comp)} · ${law} · ${place}${pol}`;
}

function functionOptionLabel(definition: FunctionDefinition, language: Language) {
  const advanced = new Set(["series_diode_barrier", "softplus_rs_modifier", "custom", "power_law", "soft_breakdown", "photocurrent_voltage_dependent"]);
  const prefix = advanced.has(definition.function_type)
    ? (language === "zh" ? "高级 · " : "Advanced · ")
    : (language === "zh" ? "基础 · " : "Basic · ");
  if (definition.function_type === "series_diode_barrier") return prefix + (language === "zh" ? "串联二极管势垒" : "Series diode barrier");
  if (definition.law_id === "ohmic") return prefix + (language === "zh" ? "有效欧姆电阻" : "Effective Ohmic resistance");
  return prefix + definition.display_name;
}

function defaultLocationForBucket(bucket: BuilderBucket, def: FunctionDefinition, model: ModelSpec): ModelLocation {
  if (bucket === "main") return "series";
  if (def.function_type === "diode") return "core";
  if (def.available_forms.includes("current_branch")) return "parallel";
  if (!model.core.length) return "core";
  return "parallel";
}

function num(v: number | undefined | null) {
  return v === undefined || v === null ? "" : String(v);
}

function isPartialNumber(text: string) {
  return text === "" ||
    text === "-" ||
    text === "+" ||
    text === "." ||
    text === "-." ||
    text === "+." ||
    /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d*)?$/.test(text);
}

function commitNumber(text: string): number | null | undefined {
  if (text === "") return null;
  if (["-", "+", ".", "-.", "+."].includes(text) || /[eE][-+]?$/.test(text)) return undefined;
  const n = Number(text);
  return Number.isFinite(n) ? n : undefined;
}

function DraftNumberInput(props: {
  value: number | null | undefined;
  placeholder?: string;
  title?: string;
  onCommit: (value: number | null) => void;
}) {
  const [draft, setDraft] = useState(num(props.value));

  function commitOrRevert() {
    const parsed = commitNumber(draft);
    if (parsed === undefined) {
      setDraft(num(props.value));
      return;
    }
    props.onCommit(parsed);
    setDraft(num(parsed));
  }

  return (
    <input
      title={props.title}
      value={draft}
      placeholder={props.placeholder}
      onChange={(e) => {
        const text = e.target.value;
        if (isPartialNumber(text)) setDraft(text);
      }}
      onBlur={commitOrRevert}
      onKeyDown={(e) => {
        if (e.key === "Enter") commitOrRevert();
        if (e.key === "Escape") setDraft(num(props.value));
      }}
    />
  );
}

function parameterSummary(comp: ComponentSpec) {
  return Object.entries(comp.params)
    .slice(0, 3)
    .map(([k, v]) => `${v.label ?? k}=${fmtEng(v.value, 3)}${v.unit ?? ""}`)
    .join(", ");
}

function CircuitCard({ model, language }: { model: ModelSpec; language: Language }) {
  const series = model.series;
  const branches = [...model.core, ...model.parallel];
  const branchCount = Math.max(branches.length, 1);
  const junctionY = 56;
  const branchStartY = 112;
  const branchGap = 42;
  const busBottom = branchStartY + (branchCount - 1) * branchGap;
  const terminalMinusY = busBottom + 42;
  const height = terminalMinusY + 34;
  const seriesLabel = series.length ? series.map(nickname).join(" → ") : t(language, "direct");
  const branchLabel = language === "zh" ? "结点分支 / 电流相加" : "Junction branches / current sum";
  const help = language === "zh"
    ? "等效电路示意图：主路元件决定结点电压，结点支路贡献端口电流。"
    : "Equivalent-circuit schematic: main-path terms set the junction voltage; junction branches contribute terminal current.";
  return <div className="model-circuit-panel circuit-panel-v2 circuit-panel-vertical-branches">
    <div className="circuit-title-row">
      <h3>{t(language, "circuit")} <HelpTip text={help} /></h3>
    </div>
    <svg className="circuit-svg" viewBox={`0 0 560 ${height}`} role="img" aria-label={language === "zh" ? "等效电路示意图" : "Equivalent circuit schematic"}>
      <title>{language === "zh" ? "端口加经主路径到 Vj，并联支路位于主路径下方并汇到公共端口减。" : "Terminal plus reaches Vj through the main path; parallel branches sit below the main path and return to one shared terminal minus."}</title>
      <defs>
        <marker id="circuit-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 Z" className="circuit-arrow" />
        </marker>
      </defs>

      <rect className="circuit-terminal" x="18" y={junctionY - 18} width="74" height="36" rx="18" />
      <text className="circuit-node-text" x="55" y={junctionY + 5} textAnchor="middle">{t(language, "terminalPlus")}</text>
      <line className="circuit-wire" x1="92" y1={junctionY} x2="128" y2={junctionY} markerEnd="url(#circuit-arrow)" />

      <rect className="circuit-main-box" x="130" y={junctionY - 22} width="220" height="44" rx="10" />
      <text className="circuit-label-small" x="240" y={junctionY - 31} textAnchor="middle">{t(language, "mainPath")}</text>
      <text className="circuit-component-text" x="240" y={junctionY + 5} textAnchor="middle">{seriesLabel}</text>

      <line className="circuit-wire" x1="350" y1={junctionY} x2="402" y2={junctionY} markerEnd="url(#circuit-arrow)" />
      <circle className="circuit-junction" cx="426" cy={junctionY} r="20" />
      <text className="circuit-vj" x="426" y={junctionY + 6} textAnchor="middle">Vj</text>

      <line className="circuit-bus" x1="426" y1={junctionY + 22} x2="426" y2={busBottom} />
      <line className="circuit-bus circuit-return-bus" x1="132" y1={branchStartY} x2="132" y2={terminalMinusY} />
      <text className="circuit-label-small" x="279" y="92" textAnchor="middle">{branchLabel}</text>

      {branches.length ? branches.map((branch, idx) => {
        const y = branchStartY + idx * branchGap;
        return <g key={branch.id}>
          <line className="circuit-wire" x1="426" y1={y} x2="330" y2={y} markerEnd="url(#circuit-arrow)" />
          <rect className="circuit-branch-box" x="238" y={y - 16} width="88" height="32" rx="9" />
          <text className="circuit-component-text" x="282" y={y + 5} textAnchor="middle">{nickname(branch)}</text>
          <line className="circuit-wire" x1="238" y1={y} x2="132" y2={y} />
        </g>;
      }) : <g>
        <line className="circuit-wire-muted" x1="426" y1={branchStartY} x2="132" y2={branchStartY} />
        <text className="circuit-muted-text" x="279" y={branchStartY + 5} textAnchor="middle">{t(language, "noBranch")}</text>
      </g>}

      <line className="circuit-wire" x1="132" y1={terminalMinusY} x2="92" y2={terminalMinusY} markerEnd="url(#circuit-arrow)" />
      <rect className="circuit-terminal circuit-terminal-minus" x="18" y={terminalMinusY - 16} width="74" height="32" rx="16" />
      <text className="circuit-node-text" x="55" y={terminalMinusY + 5} textAnchor="middle">{t(language, "terminalMinus")}</text>
    </svg>
  </div>;
}

function userDefinitions(registry: FunctionDefinition[]) {
  const seen = new Set<string>();
  return registry.filter((definition) => {
    if (definition.function_type === "shunt") return false;
    if (definition.function_type === "photo_modulated_main_path") return false;
    if (definition.law_id === "ohmic" && seen.has("ohmic")) return false;
    if (definition.law_id === "ohmic") seen.add("ohmic");
    return true;
  });
}

function allComponents(model: ModelSpec) {
  return [...model.core, ...model.series, ...model.parallel];
}

function duplicateKey(comp: ComponentSpec) {
  return [comp.law_id ?? comp.function_type, comp.evaluation_form ?? "auto", comp.placement ?? "auto", comp.polarity ?? "none"].join("|");
}

function isDuplicateBlocked(model: ModelSpec, comp: ComponentSpec) {
  const key = duplicateKey(comp);
  const matches = allComponents(model).filter((existing) => duplicateKey(existing) === key);
  if (!matches.length) return false;
  // A two-diode branch model is allowed only as an explicit D1/D2 role distinction.
  if (comp.function_type === "diode" && comp.evaluation_form === "current_branch") return matches.length >= 2;
  return true;
}

function nextNickname(model: ModelSpec, base: string) {
  const names = new Set(allComponents(model).map((comp) => nickname(comp)));
  if (!names.has(base)) return base;
  const m = base.match(/^(.*?)(\d+)$/);
  const prefix = m ? m[1] : base;
  let idx = m ? Number(m[2]) + 1 : 2;
  while (names.has(`${prefix}${idx}`)) idx += 1;
  return `${prefix}${idx}`;
}

function applyNicknameToParams(comp: ComponentSpec, nick: string): ComponentSpec {
  const params = Object.fromEntries(
    Object.entries(comp.params).map(([name, spec]) => [
      name,
      { ...spec, label: comp.law_id === "ohmic" ? nick : (spec.label ?? name) },
    ]),
  );
  return { ...comp, params, metadata: { ...comp.metadata, nickname: nick } };
}

function allowedPolarities(def?: FunctionDefinition) {
  return def?.allowed_polarities ?? [];
}

function polarityLabel(language: Language, p: string) {
  if (p === "forward") return t(language, "forwardPolarity");
  if (p === "reverse") return t(language, "reversePolarity");
  if (p === "symmetric") return t(language, "bothPolarity");
  return p;
}

function AddRow(props: {
  bucket: BuilderBucket;
  definitions: FunctionDefinition[];
  selectedDefinition?: FunctionDefinition;
  selectedPolarity?: string;
  language: Language;
  onSelectDefinition: (functionType: string) => void;
  onSelectPolarity: (polarity: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const polarities = allowedPolarities(props.selectedDefinition);
  const selectedPolarity = props.selectedPolarity || props.selectedDefinition?.default_polarity || polarities[0] || "";

  return (
    <div className="add-row">
      <select
        title={t(props.language, "functionSelectHelp")}
        value={props.selectedDefinition?.function_type ?? ""}
        onChange={(e) => props.onSelectDefinition(e.target.value)}
      >
        {props.definitions.map((definition) => (
          <option key={definition.function_type} value={definition.function_type}>
            {functionOptionLabel(definition, props.language)}
          </option>
        ))}
      </select>
      {polarities.length ? (
        <select
          title={t(props.language, "polarityHelp")}
          value={selectedPolarity}
          onChange={(e) => props.onSelectPolarity(e.target.value)}
        >
          {polarities.map((polarity) => (
            <option key={polarity} value={polarity}>{polarityLabel(props.language, polarity)}</option>
          ))}
        </select>
      ) : (
        <span className="polarity-none" title={t(props.language, "noPolarityHelp")}>
          {t(props.language, "noPolarity")}
        </span>
      )}
      <button title={props.disabledReason || t(props.language, "addComponentHelp")} disabled={props.disabled} onClick={props.onAdd}>{t(props.language, "add")}</button>
    </div>
  );
}

function ParamRow(props: {
  name: string;
  spec: ParameterSpec;
  language: Language;
  onUpdate: (patch: Partial<ParameterSpec>) => void;
}) {
  const { name, spec, language, onUpdate } = props;
  const guidance = initialValueGuidance(name, spec, language);
  return (
    <div className="param-row-wrap">
      <div className="param-row">
        <span title={`${name}: ${t(language, "parameterNameHelp")}`}>{spec.label ?? name}</span>
        <DraftNumberInput title={guidance || t(language, "initialHelp")} value={spec.value} onCommit={(value) => onUpdate({ value: value ?? spec.value })} />
        <DraftNumberInput title={t(language, "lowerHelp")} value={spec.lower} placeholder="lower" onCommit={(value) => onUpdate({ lower: value })} />
        <DraftNumberInput title={t(language, "upperHelp")} value={spec.upper} placeholder="upper" onCommit={(value) => onUpdate({ upper: value })} />
        <label title={t(language, "fitToggleHelp")}>
          <input type="checkbox" checked={spec.fit ?? true} onChange={(e) => onUpdate({ fit: e.target.checked })} /> {t(language, "fitState")}
        </label>
      </div>
    </div>
  );
}

function ComponentCard(props: {
  comp: ComponentSpec;
  location: ModelLocation;
  definition?: FunctionDefinition;
  isOpen: boolean;
  model: ModelSpec;
  language: Language;
  registry: FunctionDefinition[];
  onToggle: () => void;
  onChange: (model: ModelSpec) => void;
}) {
  const { comp, location, definition, isOpen, model, language, registry, onChange } = props;
  const componentPolarities = allowedPolarities(definition);

  function updateParam(name: string, patch: Partial<ParameterSpec>) {
    const next = { ...comp, params: { ...comp.params, [name]: { ...comp.params[name], ...patch } } };
    onChange(updateComponent(model, location, comp.id, next));
  }

  function updateMetadata(patch: Record<string, unknown>) {
    onChange(updateComponent(model, location, comp.id, { ...comp, metadata: { ...comp.metadata, ...patch } }));
  }

  function resetDefaults() {
    const def = registry.find((item) => item.function_type === comp.function_type);
    if (!def) return;
    onChange(updateComponent(model, location, comp.id, { ...comp, params: buildParams(def, nickname(comp)) }));
  }

  return (
    <div className="component-card compact-component-card">
      <div className="component-head">
        <div>
          <strong>{componentTitle(comp, language)}</strong>
          <div className="component-summary">{parameterSummary(comp)}</div>
        </div>
        <div className="component-actions">
          <button title={t(language, "initialsHelp")} onClick={props.onToggle}>{isOpen ? t(language, "hide") : t(language, "initials")}</button>
          <button title={t(language, "removeComponentHelp")} onClick={() => onChange(removeComponent(model, location, comp.id))}>{t(language, "remove")}</button>
        </div>
      </div>
      {isOpen && (
        <>
          <label className="full" title={t(language, "nicknameHelp")}>
            {t(language, "nickname")}
            <input
              title={t(language, "nicknameHelp")}
              value={nickname(comp)}
              onChange={(e) => onChange(updateComponent(model, location, comp.id, applyNicknameToParams(comp, e.target.value)))}
            />
          </label>
          {componentPolarities.length ? (
            <label className="full" title={t(language, "polarityHelp")}>
              {t(language, "polarity")}
              <select
                value={comp.polarity ?? definition?.default_polarity ?? componentPolarities[0]}
                onChange={(e) => onChange(updateComponent(model, location, comp.id, { ...comp, polarity: e.target.value as Polarity }))}
              >
                {componentPolarities.map((polarity) => <option key={polarity} value={polarity}>{polarityLabel(language, polarity)}</option>)}
              </select>
            </label>
          ) : null}
          {definition?.allowed_placements?.length ? (
            <details className="advanced-details">
              <summary>{t(language, "advancedModelDetails")}</summary>
              <label className="full" title={t(language, "formHelp")}>
                {t(language, "form")}
                <select
                  value={comp.evaluation_form ?? definition.default_form}
                  onChange={(e) => onChange(updateComponent(model, location, comp.id, { ...comp, evaluation_form: e.target.value as EvaluationForm }))}
                >
                  {definition.available_forms.map((form) => <option key={form} value={form}>{form}</option>)}
                </select>
              </label>
              <label className="full" title={t(language, "placementHelp")}>
                {t(language, "placement")}
                <select
                  value={comp.placement ?? definition.default_placement}
                  onChange={(e) => onChange(updateComponent(model, location, comp.id, { ...comp, placement: e.target.value as Placement }))}
                >
                  {definition.allowed_placements.map((placement) => <option key={placement} value={placement}>{placement}</option>)}
                </select>
              </label>
            </details>
          ) : null}
          {comp.function_type === "custom" && (
            <label className="full" title={t(language, "expressionHelp")}>
              {t(language, "expression")}
              <input title={t(language, "expressionHelp")} value={String(comp.metadata?.expression ?? "")} onChange={(e) => updateMetadata({ expression: e.target.value })} />
            </label>
          )}
          <div className="param-editor-head">
            <strong>{t(language, "initialsBounds")}</strong>
            <HelpTip text={t(language, "initialsBoundsHelp")} />
            <button title={t(language, "resetDefaultsHelp")} onClick={resetDefaults}>{t(language, "resetDefaults")}</button>
          </div>
          <div className="param-row param-header">
            <span>{t(language, "name")}</span>
            <span>{t(language, "initial")}</span>
            <span>{t(language, "lower")}</span>
            <span>{t(language, "upper")}</span>
            <span>{t(language, "fitQuestion")}</span>
          </div>
          <div className="param-grid">
            {Object.entries(comp.params).map(([name, spec]) => (
              <ParamRow key={name} name={name} spec={spec} language={language} onUpdate={(patch) => updateParam(name, patch)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function ModelBuilder({ model, registry, onChange, language }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [polarity, setPolarity] = useState<Record<string, string>>({});

  const labels = {
    main: t(language, "mainPath"),
    branches: t(language, "branches"),
  } as const;

  function definitionsForBucket(bucket: BuilderBucket) {
    return userDefinitions(registry).filter((definition) => {
      if (bucket === "main") return definition.allowed_placements.includes("series_voltage_drop") || definition.available_forms.includes("voltage_drop");
      return definition.allowed_placements.includes("parallel_current_branch") || definition.allowed_placements.includes("junction_current_branch") || definition.available_forms.includes("current_branch");
    });
  }

  function selectedDefinition(bucket: BuilderBucket) {
    const definitions = definitionsForBucket(bucket);
    return definitions.find((item) => item.function_type === selected[bucket]) ?? definitions[0];
  }

  function addFrom(bucket: BuilderBucket) {
    const definition = selectedDefinition(bucket);
    if (!definition) return;
    const polarities = allowedPolarities(definition);
    const selectedPolarity = polarities.length
      ? (polarity[bucket] || definition.default_polarity || polarities[0]) as Polarity
      : undefined;
    const location = defaultLocationForBucket(bucket, definition, model);
    let component = createComponentInLocation(definition, location, selectedPolarity);
    component = applyNicknameToParams(component, nextNickname(model, nickname(component)));
    if (isDuplicateBlocked(model, component)) return;
    onChange(addComponent(model, component));
  }

  return (
    <section className="card model-builder">
      <div className="model-sticky-summary">
        <h2>{t(language, "modelBuilder")} <HelpTip text={t(language, "modelBuilderHelp")} /></h2>
      </div>
      <CircuitCard model={model} language={language} />
      {builderBuckets.map((bucket) => {
        const definitions = definitionsForBucket(bucket);
        const definition = selectedDefinition(bucket);
        const components = bucketLocations[bucket].flatMap((location) => model[location].map((comp) => ({ location, comp })));
        const pendingLocation = definition ? defaultLocationForBucket(bucket, definition, model) : "parallel";
        const polarities = definition ? allowedPolarities(definition) : [];
        const pendingPolarity = polarities.length ? (polarity[bucket] || definition?.default_polarity || polarities[0]) as Polarity : undefined;
        const pendingComponent = definition ? createComponentInLocation(definition, pendingLocation, pendingPolarity) : null;
        const duplicateBlocked = pendingComponent ? isDuplicateBlocked(model, pendingComponent) : false;
        const duplicateReason = language === "zh"
          ? "已存在相同数学形式、位置和极性的模型项；请改用不同极性/角色，或先删除重复项。"
          : "This law/form/placement/polarity is already present. Use a different polarity/role, or remove the duplicate first.";

        return (
          <div className="model-group" key={bucket}>
            <h3>{labels[bucket]} <HelpTip text={bucket === "main" ? t(language, "mainPathUserHelp") : t(language, "branchUserHelp")} /></h3>
            <p className="model-builder-bucket-note">{bucket === "main"
              ? (language === "zh" ? "主路项描述串联压降或传输瓶颈；不要把并联电流支路放在这里。" : "Main-path terms describe series voltage drops or transport bottlenecks, not added parallel currents.")
              : (language === "zh" ? "支路项描述在结点电压下增加到端口电流的贡献。" : "Branch terms add current contributions at the junction voltage.")}</p>
            <AddRow
              bucket={bucket}
              definitions={definitions}
              selectedDefinition={definition}
              selectedPolarity={polarity[bucket]}
              language={language}
              onSelectDefinition={(functionType) => {
                const next = definitions.find((item) => item.function_type === functionType);
                setSelected((current) => ({ ...current, [bucket]: functionType }));
                setPolarity((current) => ({ ...current, [bucket]: next?.default_polarity ?? next?.allowed_polarities?.[0] ?? "" }));
              }}
              onSelectPolarity={(value) => setPolarity((current) => ({ ...current, [bucket]: value }))}
              onAdd={() => addFrom(bucket)}
              disabled={duplicateBlocked}
              disabledReason={duplicateBlocked ? duplicateReason : undefined}
            />
            {duplicateBlocked ? <p className="warning info duplicate-component-note">{duplicateReason}</p> : null}
            {components.length === 0 && <div className="empty-line">{t(language, "noComponents")}</div>}
            {components.map(({ location, comp }) => (
              <ComponentCard
                key={comp.id}
                comp={comp}
                location={location}
                definition={registry.find((item) => item.function_type === comp.function_type)}
                isOpen={open[comp.id] ?? false}
                model={model}
                language={language}
                registry={registry}
                onToggle={() => setOpen((current) => ({ ...current, [comp.id]: !(current[comp.id] ?? false) }))}
                onChange={onChange}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
