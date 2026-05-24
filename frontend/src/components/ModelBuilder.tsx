import { useState } from "react";
import type {
  ComponentSpec,
  FunctionDefinition,
  ModelSpec,
  Polarity,
} from "../model/types";
import {
  removeComponent,
  updateComponent,
} from "../model/utils";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { HelpTip } from "./HelpTip";
import { addDefinitionToModel, addSecondaryDiodeToModel, applyNicknameToParams, buildPendingComponent } from "../model-builder/mutations";
import { allowedPolarities, bucketForComponent, bucketLocations, builderBuckets, definitionsForBucket as bucketDefinitions, isDuplicateBlocked, isSingleTraceEquivalentMainPathBlocked, nickname, type BuilderBucket, type ModelLocation } from "../model-builder/rules";
import { localizedFunctionLabel } from "../content/localizedText";

function componentLawLabel(comp: ComponentSpec, language: Language) {
  if (comp.law_id === "ohmic") return language === "zh" ? "欧姆定律" : "Ohmic law";
  if (comp.function_type === "series_power_law_drop") return language === "zh" ? "Softplus voltage drop" : "Softplus voltage drop";
  return localizedFunctionLabel(comp.function_type, comp.law_id ?? comp.function_type, language);
}

function componentDisplayName(comp: ComponentSpec, language: Language) {
  return componentLawLabel(comp, language);
}

function componentDetailTitle(comp: ComponentSpec, language: Language) {
  const place = bucketForComponent(comp) === "main" ? t(language, "mainPath") : t(language, "branches");
  const role = typeof comp.metadata?.role === "string" && comp.metadata.role ? ` · ${comp.metadata.role}` : "";
  const pol = comp.polarity ? ` · ${t(language, "polarity")}: ${polarityLabel(language, comp.polarity)}` : "";
  return `${componentLawLabel(comp, language)} · ${place}${role}${pol}`;
}

function functionOptionLabel(definition: FunctionDefinition, language: Language, bucket?: BuilderBucket) {
  const advanced = new Set(["series_diode_barrier", "softplus_rs_modifier", "series_power_law_drop", "custom", "power_law", "soft_breakdown", "photocurrent_voltage_dependent"]);
  const interpretive = new Set(["photo_modulated_main_path"]);
  const prefix = interpretive.has(definition.function_type)
    ? (language === "zh" ? "解释性 · " : "Interpretive · ")
    : advanced.has(definition.function_type)
      ? (language === "zh" ? "高级 · " : "Advanced · ")
      : (language === "zh" ? "基础 · " : "Basic · ");
  if (definition.function_type === "series_diode_barrier") return prefix + (language === "zh" ? "串联二极管势垒" : "Series diode barrier");
  if (definition.function_type === "softplus_rs_modifier") return prefix + (language === "zh" ? "软开启传输调制" : "Softplus transport modifier");
  if (definition.function_type === "photo_modulated_main_path") return prefix + (language === "zh" ? "光调制有效主路电阻" : "Photo-modulated effective main path");
  if (definition.function_type === "custom" && bucket === "main") return prefix + (language === "zh" ? "自定义传输调制" : "Custom transport modifier");
  if (definition.law_id === "ohmic") return prefix + (language === "zh" ? "有效欧姆电阻" : "Effective Ohmic resistance");
  return prefix + localizedFunctionLabel(definition.function_type, definition.display_name, language);
}

interface Props {
  model: ModelSpec;
  registry: FunctionDefinition[];
  onChange: (model: ModelSpec) => void;
  language: Language;
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
  language: Language;
  onSelectDefinition: (functionType: string) => void;
  onAdd: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <div className="add-row">
      <select
        title={t(props.language, "functionSelectHelp")}
        value={props.selectedDefinition?.function_type ?? ""}
        onChange={(e) => props.onSelectDefinition(e.target.value)}
      >
        {props.definitions.map((definition) => (
          <option key={definition.function_type} value={definition.function_type}>
            {functionOptionLabel(definition, props.language, props.bucket)}
          </option>
        ))}
      </select>
      <button title={props.disabledReason || t(props.language, "addComponentHelp")} disabled={props.disabled} onClick={props.onAdd}>{t(props.language, "add")}</button>
    </div>
  );
}

function ComponentCard(props: {
  comp: ComponentSpec;
  location: ModelLocation;
  model: ModelSpec;
  definition?: FunctionDefinition;
  language: Language;
  onChange: (model: ModelSpec) => void;
}) {
  const { comp, location, model, definition, language, onChange } = props;
  const polarities = allowedPolarities(definition);

  function updateMetadata(patch: Record<string, unknown>) {
    onChange(updateComponent(model, location, comp.id, { ...comp, metadata: { ...comp.metadata, ...patch } }));
  }

  function updatePolarity(nextPolarity: Polarity) {
    onChange(updateComponent(model, location, comp.id, { ...comp, polarity: nextPolarity }));
  }

  return (
    <div className="component-card compact-component-card compact-model-row">
      <div className="component-head">
        <label className="component-nickname-edit" title={t(language, "nicknameHelp")}>
          <input
            aria-label={t(language, "nickname")}
            title={t(language, "nicknameHelp")}
            value={nickname(comp)}
            onChange={(e) => onChange(updateComponent(model, location, comp.id, applyNicknameToParams(comp, e.target.value)))}
          />
        </label>
        <strong className="component-display-name" title={componentDetailTitle(comp, language)}>
          {componentDisplayName(comp, language)}
        </strong>
        <div className="component-actions">
          {polarities.length ? (
            <select
              className="component-polarity-select"
              title={t(language, "polarityHelp")}
              value={comp.polarity ?? definition?.default_polarity ?? polarities[0]}
              onChange={(e) => updatePolarity(e.target.value as Polarity)}
            >
              {polarities.map((polarity) => (
                <option key={polarity} value={polarity}>{polarityLabel(language, polarity)}</option>
              ))}
            </select>
          ) : null}
          <button title={t(language, "removeComponentHelp")} onClick={() => onChange(removeComponent(model, location, comp.id))}>{t(language, "remove")}</button>
        </div>
      </div>
      {comp.function_type === "custom" && (
        <label className="component-expression-edit" title={t(language, "expressionHelp")}>
          <span>{t(language, "expression")}</span>
          <input title={t(language, "expressionHelp")} value={String(comp.metadata?.expression ?? "")} onChange={(e) => updateMetadata({ expression: e.target.value })} />
        </label>
      )}
    </div>
  );
}

function branchDiodes(model: ModelSpec) {
  return [...model.core, ...model.parallel].filter((comp) => comp.function_type === "diode");
}

function hasSecondaryForwardDiode(model: ModelSpec) {
  return branchDiodes(model).some((comp) => comp.polarity === "forward" && comp.metadata?.role === "secondary");
}

function canAddSecondaryDiode(model: ModelSpec) {
  const forwardDiodes = branchDiodes(model).filter((comp) => comp.polarity === "forward");
  return forwardDiodes.length === 1 && !hasSecondaryForwardDiode(model);
}

export function ModelBuilder({ model, registry, onChange, language }: Props) {
  const [selected, setSelected] = useState<Record<string, string>>({});

  const labels = {
    main: t(language, "mainPath"),
    branches: t(language, "branches"),
  } as const;

  function definitionsForBucket(bucket: BuilderBucket) {
    return bucketDefinitions(registry, bucket);
  }

  function selectedDefinition(bucket: BuilderBucket) {
    const definitions = definitionsForBucket(bucket);
    return definitions.find((item) => item.function_type === selected[bucket]) ?? definitions[0];
  }

  function definitionForComponent(comp: ComponentSpec) {
    return registry.find((definition) => definition.function_type === comp.function_type);
  }

  function addPolarityFor(bucket: BuilderBucket, definition: FunctionDefinition): Polarity | undefined {
    const polarities = allowedPolarities(definition);
    if (!polarities.length) return undefined;
    const preferred = [definition.default_polarity, ...polarities].filter(Boolean) as Polarity[];
    return preferred.find((candidate) => {
      const pending = buildPendingComponent(model, bucket, definition, candidate);
      return !isDuplicateBlocked(model, pending);
    }) ?? preferred[0];
  }

  function addFrom(bucket: BuilderBucket) {
    const definition = selectedDefinition(bucket);
    if (!definition) return;
    const result = addDefinitionToModel(model, bucket, definition, addPolarityFor(bucket, definition));
    if (!result.added) return;
    onChange(result.model);
  }

  function addSecondaryDiode() {
    if (!canAddSecondaryDiode(model)) return;
    const diodeDefinition = registry.find((definition) => definition.function_type === "diode");
    if (!diodeDefinition) return;
    const result = addSecondaryDiodeToModel(model, diodeDefinition, "forward");
    onChange(result.model);
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
        const pendingComponent = definition ? buildPendingComponent(model, bucket, definition, addPolarityFor(bucket, definition)) : null;
        const duplicateBlocked = pendingComponent ? isDuplicateBlocked(model, pendingComponent) : false;
        const equivalentBlocked = pendingComponent ? isSingleTraceEquivalentMainPathBlocked(model, pendingComponent) : false;
        const duplicateReason = equivalentBlocked
          ? (language === "zh"
            ? "单条 I-V 中该主路项通常与已有有效串联电阻不可区分；请先删除等效项，或在未来 light/dark workflow 中使用。"
            : "In a single I-V trace this main-path term is usually indistinguishable from the existing effective series resistance. Remove the equivalent term first, or reserve it for a future light/dark workflow.")
          : (language === "zh"
            ? "已存在相同数学形式、位置和极性的模型项；请改用不同极性，或使用明确的双二极管按钮，而不是普通重复 Add。"
            : "This law/form/placement/polarity is already present. Use a different polarity, or use the explicit two-diode action instead of ordinary duplicate Add.");

        return (
          <div className="model-group" key={bucket}>
            <h3>{labels[bucket]} <HelpTip text={bucket === "main" ? t(language, "mainPathUserHelp") : t(language, "branchUserHelp")} /></h3>
            <AddRow
              bucket={bucket}
              definitions={definitions}
              selectedDefinition={definition}
              language={language}
              onSelectDefinition={(functionType) => {
                setSelected((current) => ({ ...current, [bucket]: functionType }));
              }}
              onAdd={() => addFrom(bucket)}
              disabled={duplicateBlocked || equivalentBlocked}
              disabledReason={duplicateBlocked ? duplicateReason : undefined}
            />
            {components.length === 0 && <div className="empty-line">{t(language, "noComponents")}</div>}
            {bucket === "branches" && registry.some((definition) => definition.function_type === "diode") && canAddSecondaryDiode(model) ? (
              <button type="button" className="secondary-diode-button" onClick={addSecondaryDiode} title={language === "zh" ? "添加带 secondary/recombination 角色的 D2，而不是普通重复 D1。" : "Add a role-aware D2 instead of an ordinary duplicate D1."}>
                {language === "zh" ? "添加双二极管 D2（secondary）" : "Add secondary diode D2"}
              </button>
            ) : null}
            {components.map(({ location, comp }) => (
              <ComponentCard
                key={comp.id}
                comp={comp}
                location={location}
                model={model}
                definition={definitionForComponent(comp)}
                language={language}
                onChange={onChange}
              />
            ))}
          </div>
        );
      })}
    </section>
  );
}
