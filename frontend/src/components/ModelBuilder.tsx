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

function HelpTip({ text }: { text: string }) {
  return <span className="help-tip" title={text} aria-label={text}>?</span>;
}

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

function userDefinitions(registry: FunctionDefinition[]) {
  const seen = new Set<string>();
  return registry.filter((definition) => {
    if (definition.law_id === "ohmic" && seen.has("ohmic")) return false;
    if (definition.function_type === "shunt") return false;
    seen.add(definition.law_id || definition.function_type);
    return true;
  });
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
            {definition.law_id === "ohmic" ? "Ohmic" : definition.display_name}
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
      <button title={t(props.language, "addComponentHelp")} onClick={props.onAdd}>{t(props.language, "add")}</button>
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
      {guidance ? <div className="initial-guidance">{guidance}</div> : null}
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

  function definitionsForBucket(_bucket: BuilderBucket) {
    return userDefinitions(registry);
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
    onChange(addComponent(model, createComponentInLocation(definition, location, selectedPolarity)));
  }

  return (
    <section className="card model-builder">
      <div className="model-sticky-summary">
        <h2>{t(language, "modelBuilder")}</h2>
        <div className="model-summary-line">
          <span>{t(language, "mainPath")}: {model.series.map(nickname).join(" → ") || "—"}</span>
          <span>{t(language, "branches")}: {[...model.core, ...model.parallel].map(nickname).join(" ∥ ") || "—"}</span>
        </div>
      </div>
      <p className="muted compact-help">{t(language, "modelBuilderShortHelp")} <HelpTip text={t(language, "modelBuilderHelp")} /></p>
      {builderBuckets.map((bucket) => {
        const definitions = definitionsForBucket(bucket);
        const definition = selectedDefinition(bucket);
        const components = bucketLocations[bucket].flatMap((location) => model[location].map((comp) => ({ location, comp })));

        return (
          <div className="model-group" key={bucket}>
            <h3>{labels[bucket]} <HelpTip text={bucket === "main" ? t(language, "mainPathUserHelp") : t(language, "branchUserHelp")} /></h3>
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
            />
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
