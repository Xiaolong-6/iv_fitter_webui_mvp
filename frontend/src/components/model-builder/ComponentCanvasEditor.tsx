import { useMemo, useState } from "react";
import type { FunctionDefinition } from "../../model/types";
import { nickname } from "../../model-builder/rules";
import {
  componentDisplayName,
  componentRoleLabel,
  definitionsForBucket,
  findComponentRef,
  functionOptionLabel,
  componentEquation,
  zoneForComponent,
} from "./modelHelpers";
import { BlockMath } from "./math";
import { useModelFlowContext } from "./flowContext";
import { isPolarityMeaningful } from "../../model/modelDisplaySemantics";
import {
  validateCustomExpression,
  variableLegend,
  defaultCustomExpression,
  physicalFormLabel,
} from "../../model/customLawValidation";
import type { Language } from "../../model/i18n";

const POLARITY_OPTIONS = [
  { value: "forward", en: "Forward", zh: "正向" },
  { value: "reverse", en: "Reverse", zh: "反向" },
  { value: "symmetric", en: "Symmetric", zh: "对称" },
];

function VariableLegend({ zone, language }: { zone: "main" | "branches"; language: Language }) {
  const vars = variableLegend(zone, language);
  return <div className="xy-custom-variable-legend">
    <span className="xy-custom-legend-title">{language === "zh" ? "变量图例" : "Variable legend"}</span>
    <div className="xy-custom-legend-grid">
      {vars.map((v: { symbol: string; description: string }) => <span className="xy-custom-legend-item" key={v.symbol} title={v.description}>
        <strong>{v.symbol}</strong><small>{v.description}</small>
      </span>)}
    </div>
  </div>;
}

function ValidationErrors({ errors, language }: { errors: Array<{ en: string; zh: string }>; language: Language }) {
  if (!errors.length) return null;
  return <div className="xy-custom-validation-errors" role="alert">
    {errors.map((err, i) => <span key={i} className="xy-custom-validation-error">{err[language === "zh" ? "zh" : "en"]}</span>)}
  </div>;
}

export function ComponentCanvasEditor({ selectedId }: { selectedId: string | null }) {
  const { model, registry, language, disabled, readOnly, renameById, replaceDefinitionById, updateExpressionById, updatePolarityById } = useModelFlowContext();
  const ref = selectedId ? findComponentRef(model, selectedId) : null;
  const definitions = useMemo<FunctionDefinition[]>(() => {
    if (!ref) return [];
    return definitionsForBucket(registry, zoneForComponent(ref.comp));
  }, [ref, registry]);
  const [showLegend, setShowLegend] = useState(false);

  if (!ref || readOnly) return null;
  const comp = ref.comp;
  const zone = zoneForComponent(comp);
  const title = nickname(comp);
  const currentDefinition = definitions.find((item) => item.function_type === comp.function_type) ?? definitions[0];
  const isCustom = comp.function_type === "custom" || comp.law_id === "custom_expression";
  const expression = String(comp.metadata?.expression ?? defaultCustomExpression(zone));
  const unitBadges = Object.entries(comp.params).map(([paramName, spec]) => ({
    name: spec.label ?? paramName,
    unit: spec.unit || "—",
    description: spec.description ?? paramName,
  }));
  const typeLabel = zone === "main" ? (language === "zh" ? "主路" : "Main path") : (language === "zh" ? "分支" : "Branch");
  const showPolarity = isPolarityMeaningful(comp);

  const validation = isCustom ? validateCustomExpression(expression, zone, language) : { valid: true, errors: [] };

  const polarityTooltip = language === "zh"
    ? "正向：电流定律使用正支路电压约定。\n反向：电流定律使用相反的极性/符号约定。\n对称：极性无关（如欧姆电阻）。"
    : "Forward: current law evaluated with positive branch voltage convention.\nReverse: current law uses opposite polarity/sign convention.\nPolarity-irrelevant (e.g. Ohmic resistors).";

  return <aside className={`xy-canvas-component-editor xy-canvas-component-editor-${zone}`} aria-label={language === "zh" ? "元件详情" : "Component details"} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <header className="xy-editor-header">
      <div className="xy-editor-title-block">
        <span className="xy-editor-eyebrow">{language === "zh" ? "当前元件" : "Selected component"}</span>
        <strong>{title}</strong>
        <small>{componentDisplayName(comp, language)}</small>
      </div>
      <span className="physics-badge physics-badge-zone">{typeLabel}</span>
    </header>

    <section className="xy-editor-fields" aria-label={language === "zh" ? "基本设置" : "Basic settings"}>
      <label>
        <span>{language === "zh" ? "名称" : "Name"}</span>
        <input
          disabled={disabled}
          value={title}
          onChange={(event) => renameById(comp.id, event.target.value)}
        />
      </label>
      <label>
        <span>{language === "zh" ? "模型" : "Model"}</span>
        <select
          disabled={disabled || definitions.length === 0}
          value={currentDefinition?.function_type ?? comp.function_type}
          onChange={(event) => replaceDefinitionById(comp.id, event.target.value)}
        >
          {definitions.map((definition) => {
            const label = functionOptionLabel(definition, language, zone);
            return <option key={definition.function_type} value={definition.function_type} title={label}>{label}</option>;
          })}
        </select>
      </label>
      {showPolarity ? <label>
        <span title={polarityTooltip}>{language === "zh" ? "极性" : "Polarity"}<span className="xy-field-help">?</span></span>
        <select
          disabled={disabled}
          value={comp.polarity ?? "forward"}
          onChange={(event) => updatePolarityById(comp.id, event.target.value)}
        >
          {POLARITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{language === "zh" ? opt.zh : opt.en}</option>)}
        </select>
      </label> : null}
    </section>

    <div className="xy-canvas-component-role">{componentRoleLabel(comp, language)}</div>

    {isCustom ? <div className="xy-custom-law-builder">
      <div className="xy-custom-law-form">
        <span className="xy-custom-form-label">{language === "zh" ? "物理形式" : "Physical form"}</span>
        <span className="xy-custom-form-value">{physicalFormLabel(zone, language)}</span>
      </div>

      <label className="xy-custom-expression-field">
        <span>{language === "zh" ? "自定义表达式" : "Custom expression"}</span>
        <textarea
          disabled={disabled}
          rows={3}
          value={expression}
          onChange={(event) => updateExpressionById(comp.id, event.target.value)}
          placeholder={zone === "main" ? "A * I" : "A * Vi"}
          className={validation.valid ? "" : "xy-custom-expression-error"}
        />
      </label>

      <ValidationErrors errors={validation.errors} language={language} />

      <button
        type="button"
        className="xy-custom-legend-toggle"
        onClick={() => setShowLegend((v) => !v)}
      >
        {showLegend
          ? (language === "zh" ? "隐藏变量图例" : "Hide variable legend")
          : (language === "zh" ? "显示变量图例" : "Show variable legend")}
      </button>

      {showLegend ? <VariableLegend zone={zone} language={language} /> : null}
    </div> : null}

    <section className="xy-canvas-component-equation" aria-label={language === "zh" ? "控制方程" : "Governing equation"}>
      <span>{language === "zh" ? "控制方程" : "Governing equation"}</span>
      <BlockMath math={componentEquation(comp)} />
    </section>

    {unitBadges.length ? <div className="xy-canvas-component-units" aria-label={language === "zh" ? "参数单位" : "Parameter units"}>
      {unitBadges.map((badge) => <span className="physics-badge physics-unit-badge" key={`${badge.name}-${badge.unit}`} title={`${badge.description} · ${badge.unit}`}>
        <strong>{badge.name}</strong><small>{badge.unit}</small>
      </span>)}
    </div> : null}
  </aside>;
}
