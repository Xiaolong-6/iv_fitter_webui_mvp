import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
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
  advancedVariableLegend,
  defaultCustomExpression,
  physicalFormLabel,
  inferredCustomScaleUnit,
  inferredCustomScaleDescription,
} from "../../model/customLawValidation";
import type { Language } from "../../model/i18n";

const POLARITY_OPTIONS = [
  { value: "forward", en: "Forward", zh: "正向" },
  { value: "reverse", en: "Reverse", zh: "反向" },
  { value: "symmetric", en: "Symmetric", zh: "对称" },
];

function VariableLegend({ zone, language, showAdvanced, setShowAdvanced }: { zone: "main" | "branches"; language: Language; showAdvanced: boolean; setShowAdvanced: (value: boolean) => void }) {
  const vars = variableLegend(zone, language);
  const advancedVars = advancedVariableLegend(zone, language);
  return <div className="xy-custom-variable-legend">
    <span className="xy-custom-legend-title">{language === "zh" ? "变量" : "Variables"}</span>
    <div className="xy-custom-legend-grid xy-custom-legend-grid-primary">
      {vars.map((v: { symbol: string; description: string }) => <span className="xy-custom-legend-item" key={v.symbol} title={v.description}>
        <strong>{v.symbol}</strong><small>{v.description}</small>
      </span>)}
    </div>
    <button type="button" className="xy-custom-legend-toggle compact" aria-expanded={showAdvanced} onClick={() => setShowAdvanced(!showAdvanced)}>
      {showAdvanced
        ? (language === "zh" ? "▾ 高级变量" : "▾ Advanced variables")
        : (language === "zh" ? "▸ 高级变量" : "▸ Advanced variables")}
    </button>
    {showAdvanced ? <div className="xy-custom-legend-grid xy-custom-legend-grid-advanced">
      {advancedVars.map((v: { symbol: string; description: string }) => <span className="xy-custom-legend-item" key={v.symbol} title={v.description}>
        <strong>{v.symbol}</strong><small>{v.description}</small>
      </span>)}
    </div> : null}
  </div>;
}

function ValidationErrors({ errors, language }: { errors: Array<{ en: string; zh: string }>; language: Language }) {
  if (!errors.length) return null;
  return <div className="xy-custom-validation-errors" role="alert">
    {errors.map((err, i) => <span key={i} className="xy-custom-validation-error">{err[language === "zh" ? "zh" : "en"]}</span>)}
  </div>;
}

function displayParameterName(key: string, label?: string | null) {
  const raw = (label || key).trim();
  const aliases: Record<string, string> = {
    Vt_V: "Vt",
    Vs_V: "Vs",
    Vt_ph_V: "Vt",
    Vs_ph_V: "Vs",
    Iph0_A: "I0",
  };
  return aliases[raw] ?? aliases[key] ?? raw.replace(/_V$/, "").replace(/_A$/, "").replace(/_ohm$/, "");
}


export function ComponentCanvasEditor({ selectedId, onHeaderPointerDown }: { selectedId: string | null; onHeaderPointerDown?: (event: ReactPointerEvent) => void }) {
  const { model, registry, language, disabled, readOnly, renameById, replaceDefinitionById, updateExpressionById, updatePolarityById } = useModelFlowContext();
  const ref = selectedId ? findComponentRef(model, selectedId) : null;
  const definitions = useMemo<FunctionDefinition[]>(() => {
    if (!ref) return [];
    return definitionsForBucket(registry, zoneForComponent(ref.comp));
  }, [ref, registry]);
  const [showAdvancedVariables, setShowAdvancedVariables] = useState(false);

  if (!ref || readOnly) return null;
  const comp = ref.comp;
  const zone = zoneForComponent(comp);
  const title = nickname(comp);
  const currentDefinition = definitions.find((item) => item.function_type === comp.function_type) ?? definitions[0];
  const isCustom = comp.function_type === "custom" || comp.law_id === "custom_expression";
  const rawExpression = typeof comp.metadata?.expression === "string" ? comp.metadata.expression : "";
  const expression = rawExpression.trim() ? rawExpression : defaultCustomExpression(zone);
  const isBuiltInPresetExpression = isCustom && comp.metadata?.expressionSource !== "user" && /softplus\s*\(/i.test(rawExpression || "");
  const unitBadges = Object.entries(comp.params).map(([paramName, spec]) => {
    const inferredUnit = isCustom && paramName === "A" ? inferredCustomScaleUnit(zone, expression) : null;
    const inferredDescription = isCustom && paramName === "A" ? inferredCustomScaleDescription(zone, expression, language) : null;
    return {
      key: paramName,
      name: displayParameterName(paramName, spec.label),
      unit: inferredUnit ?? spec.unit ?? "dimensionless",
      description: inferredDescription ?? spec.description ?? paramName,
    };
  });
  const typeLabel = zone === "main" ? (language === "zh" ? "主路" : "Main path") : (language === "zh" ? "分支" : "Branch");
  const customLawDisplayLabel = zone === "main"
    ? (language === "zh" ? "自定义主路压降" : "Custom main-path voltage drop")
    : (language === "zh" ? "自定义支路电流定律" : "Custom branch current law");
  const showPolarity = isPolarityMeaningful(comp) || (isCustom && zone === "branches");

  const validation = isCustom ? validateCustomExpression(expression, zone, language) : { valid: true, errors: [] };

  const polarityTooltip = language === "zh"
    ? "正向：电流定律使用正支路电压约定。\n反向：电流定律使用相反的极性/符号约定。\n对称：极性无关（如欧姆电阻）。"
    : zone === "branches"
      ? "Forward: positive branch current follows V_i → component → V=0. Reverse flips the sign convention."
      : "Polarity is handled by signed current I.";

  return <aside className={`xy-canvas-component-editor xy-canvas-component-editor-${zone}`} aria-label={language === "zh" ? "元件详情" : "Component details"} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <header className="xy-editor-header" onPointerDown={onHeaderPointerDown} title={language === "zh" ? "拖拽移动详情面板" : "Drag to move the inspector"}>
      <div className="xy-editor-title-block">
        <span className="xy-editor-eyebrow">{language === "zh" ? "当前元件" : "Selected component"}</span>
        <strong>{title}</strong>
        <small>{isCustom ? customLawDisplayLabel : componentDisplayName(comp, language)}</small>
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
        <span title={polarityTooltip}>{language === "zh" ? "极性" : "Polarity"}<span className="xy-field-help">ⓘ</span></span>
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
      <div className="xy-custom-expression-source">
        {isBuiltInPresetExpression
          ? (language === "zh" ? "内置/预设表达式；编辑后会变为用户自定义。" : "Built-in/preset expression. Editing converts it to a user-defined law.")
          : customLawDisplayLabel}
      </div>

      <label className="xy-custom-expression-field">
        <span>{language === "zh" ? "表达式" : "Expression"}</span>
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

      <VariableLegend zone={zone} language={language} showAdvanced={showAdvancedVariables} setShowAdvanced={setShowAdvancedVariables} />

      <div className="xy-custom-syntax-help">
        <strong>{language === "zh" ? "表达式语法" : "Expression syntax"}</strong>
        <span>{zone === "main"
          ? (language === "zh" ? "乘法：A * I" : "Multiplication: A * I")
          : (language === "zh" ? "乘法：A * Vi" : "Multiplication: A * Vi")}</span>
        <span>{zone === "main"
          ? (language === "zh" ? "幂：I**2" : "Powers: I**2")
          : (language === "zh" ? "幂：Vi**2" : "Powers: Vi**2")}</span>
        <span>{language === "zh" ? "函数：softplus(x), sigmoid(x), exp(x), log(x), log10(x), log1p(x), sqrt(x), abs(x), sign(x), minimum(x,y), maximum(x,y), clip(x,a,b), sin/cos/tan/tanh" : "Functions: softplus(x), sigmoid(x), exp(x), log(x), log10(x), log1p(x), sqrt(x), abs(x), sign(x), min/max via minimum(x,y), maximum(x,y), clip(x,a,b), sin/cos/tan/tanh"}</span>
        <span>{zone === "main"
          ? (language === "zh" ? "主路默认变量：I" : "Default main-path variable: I")
          : (language === "zh" ? "分支默认变量：Vi（显示为 V_i）" : "Default branch variable: Vi (shown as V_i)")}</span>
      </div>

      {!showPolarity ? <p className="xy-custom-polarity-note">{language === "zh"
        ? "此主路自定义压降直接使用带符号电流 I，因此不显示额外极性选择。"
        : "Polarity is handled by signed current I."}</p> : null}
    </div> : null}

    <section className="xy-canvas-component-equation" aria-label={language === "zh" ? "控制方程" : "Governing equation"}>
      <span>{language === "zh" ? "控制方程" : "Governing equation"}</span>
      <BlockMath math={componentEquation(comp)} />
    </section>

    {unitBadges.length ? <div className="xy-canvas-component-units" aria-label={language === "zh" ? "参数单位" : "Parameter units"}>
      {unitBadges.map((badge) => <span className="physics-badge physics-unit-badge" key={`${badge.key}-${badge.unit}`} title={`${badge.key}: ${badge.description} · unit: ${badge.unit}`}>
        <strong>{badge.name}</strong><small>{language === "zh" ? `单位 ${badge.unit}` : `unit ${badge.unit}`}</small>
      </span>)}
    </div> : null}
  </aside>;
}
