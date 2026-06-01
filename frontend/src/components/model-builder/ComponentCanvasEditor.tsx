import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { FunctionDefinition, ParameterSpec } from "../../model/types";
import { nickname } from "../../model-builder/rules";
import { componentDisplayName, componentRoleLabel, findComponentRef, functionOptionLabel, zoneForComponent } from "./modelHelpers";
import { BlockMath } from "./math";
import { useModelFlowContext } from "./flowContext";
import { validateCustomExpression } from "../../model/customLawValidation";
import type { ComponentBehaviorMode } from "./types";

const POLARITY_OPTIONS = [
  { value: "forward", en: "Forward", zh: "正向" },
  { value: "reverse", en: "Reverse", zh: "反向" },
  { value: "symmetric", en: "Symmetric", zh: "对称" },
];

const BEHAVIOR_OPTIONS: Array<{ value: ComponentBehaviorMode; en: string; zh: string; equation: string }> = [
  { value: "R_of_V", en: "R(V): voltage-dependent resistance", zh: "R(V)：电压相关电阻", equation: "I = V / R(V)" },
  { value: "I_of_V", en: "I(V): direct current expression", zh: "I(V)：直接电流表达式", equation: "I = f(V)" },
  { value: "dV_of_I", en: "ΔV(I): voltage drop expression", zh: "ΔV(I)：压降表达式", equation: "ΔV = f(I)" },
  { value: "custom_residual", en: "Custom residual F(I,V)=0", zh: "自定义残差 F(I,V)=0", equation: "F(I,V,θ)=0" },
];

function inferBehavior(comp: NonNullable<ReturnType<typeof findComponentRef>>["comp"]): ComponentBehaviorMode {
  const raw = comp.metadata?.behavior;
  if (raw === "R_of_V" || raw === "I_of_V" || raw === "dV_of_I" || raw === "custom_residual") return raw;
  if (comp.law_id === "ohmic") return "R_of_V";
  if (comp.function_type === "diode") return "I_of_V";
  if (comp.evaluation_form === "voltage_drop") return "dV_of_I";
  return "I_of_V";
}

function expressionFor(comp: NonNullable<ReturnType<typeof findComponentRef>>["comp"], behavior: ComponentBehaviorMode) {
  const raw = typeof comp.metadata?.expression === "string" ? comp.metadata.expression.trim() : "";
  if (raw) return raw;
  if (behavior === "R_of_V") {
    const first = Object.values(comp.params)[0];
    return first?.label ? String(first.label) : "R0";
  }
  if (behavior === "I_of_V" && comp.function_type === "diode") return "I0 * (exp(V / (n * Vt)) - 1)";
  if (behavior === "I_of_V") return "V / R0";
  if (behavior === "dV_of_I") return "I * R0";
  return "I - V / R0";
}

function expressionLatex(behavior: ComponentBehaviorMode, expression: string) {
  const safe = expression.replace(/_/g, "\\_").replace(/\*/g, " ");
  if (behavior === "R_of_V") return `I = \\frac{V}{${safe || "R(V)"}}`;
  if (behavior === "I_of_V") return `I = ${safe || "f(V)"}`;
  if (behavior === "dV_of_I") return `\\Delta V = ${safe || "f(I)"}`;
  return `${safe || "F(I,V,\\theta)"} = 0`;
}

function numericInputValue(value: number | null | undefined) {
  return value === null || value === undefined || Number.isNaN(value) ? "" : String(value);
}

function toNumberOrNull(value: string) {
  const clean = value.trim();
  if (!clean) return null;
  const parsed = Number(clean);
  return Number.isFinite(parsed) ? parsed : null;
}

function defaultParamUnit(param: ParameterSpec) {
  return param.unit ?? "";
}

export function ComponentCanvasEditor({ selectedId, onHeaderPointerDown }: { selectedId: string | null; onHeaderPointerDown?: (event: ReactPointerEvent) => void }) {
  const {
    model,
    registry,
    language,
    disabled,
    readOnly,
    renameById,
    replaceDefinitionById,
    updateExpressionById,
    updateBehaviorById,
    updatePolarityById,
    addCustomParameterById,
    updateCustomParameterById,
    removeCustomParameterById,
  } = useModelFlowContext();
  const ref = selectedId ? findComponentRef(model, selectedId) : null;
  const [showAdvanced, setShowAdvanced] = useState(false);

  const definitions = useMemo<FunctionDefinition[]>(() => registry, [registry]);
  if (!ref || readOnly) return null;

  const comp = ref.comp;
  const zone = zoneForComponent(comp);
  const behavior = inferBehavior(comp);
  const expression = expressionFor(comp, behavior);
  const behaviorLabel = BEHAVIOR_OPTIONS.find((item) => item.value === behavior) ?? BEHAVIOR_OPTIONS[0];
  const validation = validateCustomExpression(expression, zone, language, Object.entries(comp.params).flatMap(([name, param]) => [name, String(param.label ?? name)]));
  const title = nickname(comp);
  const zoneText = zone === "main" ? (language === "zh" ? "路径元件" : "Path component") : (language === "zh" ? "分支元件" : "Branch component");
  const pathId = typeof comp.metadata?.pathId === "string" ? comp.metadata.pathId : (zone === "main" ? "path:main" : `path:${comp.id}`);

  return <aside className={`xy-canvas-component-editor xy-canvas-component-editor-${zone}`} aria-label={language === "zh" ? "元件详情" : "Component details"} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
    <header className="xy-editor-header" onPointerDown={onHeaderPointerDown} title={language === "zh" ? "拖拽移动详情面板" : "Drag to move the inspector"}>
      <div className="xy-editor-title-block">
        <span className="xy-editor-eyebrow">{language === "zh" ? "当前元件" : "Selected component"}</span>
        <strong>{title}</strong>
        <small>{behaviorLabel[language === "zh" ? "zh" : "en"]}</small>
      </div>
      <span className="physics-badge physics-badge-zone">{zoneText}</span>
    </header>

    <section className="xy-editor-fields" aria-label={language === "zh" ? "基本设置" : "Basic settings"}>
      <label>
        <span>{language === "zh" ? "名称" : "Name"}</span>
        <input disabled={disabled} value={title} onChange={(event) => renameById(comp.id, event.target.value)} />
      </label>
      <label>
        <span>{language === "zh" ? "行为" : "Behavior"}</span>
        <select disabled={disabled} value={behavior} onChange={(event) => updateBehaviorById(comp.id, event.target.value as ComponentBehaviorMode)}>
          {BEHAVIOR_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item[language === "zh" ? "zh" : "en"]}</option>)}
        </select>
      </label>
      <label>
        <span>{language === "zh" ? "预设" : "Preset"}</span>
        <select disabled={disabled || definitions.length === 0} value={comp.function_type} onChange={(event) => replaceDefinitionById(comp.id, event.target.value)}>
          {definitions.map((definition) => <option key={definition.function_type} value={definition.function_type} title={functionOptionLabel(definition, language, zone)}>{functionOptionLabel(definition, language, zone)}</option>)}
        </select>
      </label>
      <label>
        <span>{language === "zh" ? "符号/极性" : "Sign / polarity"}</span>
        <select disabled={disabled} value={comp.polarity ?? "forward"} onChange={(event) => updatePolarityById(comp.id, event.target.value)}>
          {POLARITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{language === "zh" ? opt.zh : opt.en}</option>)}
        </select>
      </label>
    </section>

    <div className="xy-canvas-component-role">
      <strong>{componentDisplayName(comp, language)}</strong>
      <span>{componentRoleLabel(comp, language)}</span>
      <span>{language === "zh" ? "路径" : "Path"}: {pathId}</span>
    </div>

    <section className="xy-custom-law-builder xy-custom-law-builder-always">
      <div className="xy-custom-law-form">
        <span className="xy-custom-form-label">{language === "zh" ? "统一变量" : "Unified variables"}</span>
        <span className="xy-custom-form-value">V = {language === "zh" ? "该元件/路径两端电压差" : "local voltage drop"}; I = {language === "zh" ? "路径电流" : "path current"}</span>
      </div>
      <label className="xy-custom-expression-field">
        <span>{behaviorLabel.equation}</span>
        <textarea disabled={disabled} rows={3} value={expression} onChange={(event) => updateExpressionById(comp.id, event.target.value)} placeholder={behavior === "R_of_V" ? "R0 * (1 + A * V)" : behavior === "I_of_V" ? "V / R0" : "I * R0"} className={validation.valid ? "" : "xy-custom-expression-error"} />
      </label>
      {!validation.valid ? <div className="xy-custom-validation-errors" role="alert">
        {validation.errors.map((err, index) => <span key={index} className="xy-custom-validation-error">{err[language === "zh" ? "zh" : "en"]}</span>)}
      </div> : null}
      <div className="xy-custom-syntax-help">
        <strong>{language === "zh" ? "表达式规则" : "Expression rules"}</strong>
        <span>{language === "zh" ? "可直接使用变量 V 和 I；V 是本元件/路径两端电压，I 是该路径电流。" : "Use V and I directly; V is local voltage, I is path current."}</span>
        <span>{language === "zh" ? "可使用 exp/log/sqrt/abs/softplus/sigmoid/tanh/minimum/maximum/clip 等安全函数。" : "Safe functions include exp/log/sqrt/abs/softplus/sigmoid/tanh/minimum/maximum/clip."}</span>
        <span>{language === "zh" ? "用户写的公式保持不变；solver 只做变量映射和 residual 编译。" : "The user formula is preserved; solver only maps variables and compiles residuals."}</span>
      </div>
    </section>

    <section className="xy-canvas-component-equation" aria-label={language === "zh" ? "控制方程" : "Governing equation"}>
      <span>{language === "zh" ? "用户公式" : "User law"}</span>
      <BlockMath math={expressionLatex(behavior, expression)} />
    </section>

    <section className="xy-param-editor-card" aria-label={language === "zh" ? "自定义参数表" : "Custom parameter table"}>
      <div className="xy-param-editor-headline">
        <strong>{language === "zh" ? "拟合参数" : "Fitting parameters"}</strong>
        <button type="button" disabled={disabled} onClick={() => addCustomParameterById(comp.id)}>+ {language === "zh" ? "添加参数" : "Add parameter"}</button>
      </div>
      <div className="xy-param-editor-table">
        <div className="xy-param-editor-row xy-param-editor-row-head">
          <span>{language === "zh" ? "符号" : "Symbol"}</span>
          <span>{language === "zh" ? "初值" : "Value"}</span>
          <span>{language === "zh" ? "下界" : "Lower"}</span>
          <span>{language === "zh" ? "上界" : "Upper"}</span>
          <span>{language === "zh" ? "拟合" : "Fit"}</span>
          <span />
        </div>
        {Object.entries(comp.params).map(([paramName, param]) => <div className="xy-param-editor-row" key={paramName}>
          <input disabled={disabled} value={param.label ?? paramName} title={paramName} onChange={(event) => updateCustomParameterById(comp.id, paramName, { nextName: event.target.value })} />
          <input disabled={disabled} value={numericInputValue(param.value)} onChange={(event) => updateCustomParameterById(comp.id, paramName, { value: toNumberOrNull(event.target.value) ?? param.value })} />
          <input disabled={disabled} value={numericInputValue(param.lower)} placeholder="-∞" onChange={(event) => updateCustomParameterById(comp.id, paramName, { lower: toNumberOrNull(event.target.value) })} />
          <input disabled={disabled} value={numericInputValue(param.upper)} placeholder="∞" onChange={(event) => updateCustomParameterById(comp.id, paramName, { upper: toNumberOrNull(event.target.value) })} />
          <label className="xy-param-fit-toggle"><input disabled={disabled} type="checkbox" checked={param.fit ?? false} onChange={(event) => updateCustomParameterById(comp.id, paramName, { fit: event.target.checked })} /></label>
          <button type="button" disabled={disabled} title={language === "zh" ? "删除参数" : "Remove parameter"} onClick={() => removeCustomParameterById(comp.id, paramName)}>×</button>
        </div>)}
      </div>
      {showAdvanced ? <div className="xy-custom-syntax-help xy-advanced-param-note">
        <span>{language === "zh" ? "参数名应与公式中的符号一致，例如 R0、A、I0、n。单位字段暂随原参数保留。" : "Parameter symbols should match the expression, e.g. R0, A, I0, n. Existing units are preserved where available."}</span>
        <span>{language === "zh" ? "当前单位提示" : "Current unit hints"}: {Object.values(comp.params).map((p) => defaultParamUnit(p) || "dimensionless").join(", ")}</span>
      </div> : null}
      <button type="button" className="xy-custom-legend-toggle compact" onClick={() => setShowAdvanced(!showAdvanced)}>{showAdvanced ? (language === "zh" ? "收起参数说明" : "Hide parameter notes") : (language === "zh" ? "参数说明" : "Parameter notes")}</button>
    </section>
  </aside>;
}
