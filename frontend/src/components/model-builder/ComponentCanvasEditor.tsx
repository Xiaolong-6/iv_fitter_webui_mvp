import { useMemo } from "react";
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

export function ComponentCanvasEditor({ selectedId }: { selectedId: string | null }) {
  const { model, registry, language, disabled, readOnly, renameById, replaceDefinitionById, updateExpressionById } = useModelFlowContext();
  const ref = selectedId ? findComponentRef(model, selectedId) : null;
  const definitions = useMemo<FunctionDefinition[]>(() => {
    if (!ref) return [];
    return definitionsForBucket(registry, zoneForComponent(ref.comp));
  }, [ref, registry]);

  if (!ref || readOnly) return null;
  const comp = ref.comp;
  const zone = zoneForComponent(comp);
  const title = nickname(comp);
  const currentDefinition = definitions.find((item) => item.function_type === comp.function_type) ?? definitions[0];
  const isCustom = comp.function_type === "custom" || comp.law_id === "custom_expression";
  const expression = String(comp.metadata?.expression ?? (zone === "main" ? "A*softplus(u)" : "s*A*softplus(u)**m"));
  const unitBadges = Object.entries(comp.params).map(([paramName, spec]) => ({
    name: spec.label ?? paramName,
    unit: spec.unit || "—",
    description: spec.description ?? paramName,
  }));
  const typeLabel = zone === "main" ? (language === "zh" ? "主路" : "Main path") : (language === "zh" ? "分支" : "Branch");

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
    </section>

    <div className="xy-canvas-component-role">{componentRoleLabel(comp, language)}</div>

    {isCustom ? <label className="xy-custom-expression-field">
      <span>{language === "zh" ? "自定义表达式" : "Custom expression"}</span>
      <textarea
        disabled={disabled}
        rows={2}
        value={expression}
        onChange={(event) => updateExpressionById(comp.id, event.target.value)}
        placeholder={zone === "main" ? "A*softplus(u)" : "s*A*softplus(u)**m"}
      />
      <small>{language === "zh" ? "可用变量: V, absV, u, s 与参数 A, Vt_V, Vs_V, m。" : "Available: V, absV, u, s and parameters A, Vt_V, Vs_V, m."}</small>
    </label> : null}

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
