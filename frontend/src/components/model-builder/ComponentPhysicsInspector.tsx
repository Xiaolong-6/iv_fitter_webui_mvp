import type { FunctionDefinition, ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import { nickname } from "../../model-builder/rules";
import {
  aggregateCurrentEquation,
  aggregateVoltageEquation,
  componentDisplayName,
  componentEquation,
  componentRoleLabel,
  definitionForComponent,
  polarityLabel,
  zoneForComponent,
} from "./modelHelpers";
import { BlockMath } from "./math";
import type { ComponentRef } from "./types";

export function ComponentPhysicsInspector({ refItem, registry, language }: {
  refItem: ComponentRef | null;
  model: ModelSpec;
  registry: FunctionDefinition[];
  language: Language;
  disabled?: boolean;
  onChange: (model: ModelSpec) => void;
}) {
  if (!refItem) {
    return <aside className="component-inspector light-inspector compact-physics-inspector empty-inspector model-builder-default-inspector">
      <div className="physics-component-head">
        <strong>{language === "zh" ? "模型摘要" : "Model summary"}</strong>
        <span>{language === "zh" ? "点击元件查看物理角色" : "Select a component for physical details"}</span>
      </div>
      <div className="physics-equation-card">
        <span>{language === "zh" ? "电压平衡" : "Voltage balance"}</span>
        <BlockMath math={aggregateVoltageEquation()} />
        <small>{language === "zh" ? "主路径项决定结电压" : "Main-path terms determine the junction voltage."}</small>
      </div>
      <div className="physics-equation-card">
        <span>{language === "zh" ? "电流求和" : "Current sum"}</span>
        <BlockMath math={aggregateCurrentEquation()} />
        <small>{language === "zh" ? "分支在同一结电压下贡献电流" : "Branches contribute current at the same junction voltage."}</small>
      </div>
    </aside>;
  }
  const { comp } = refItem;
  const definition = definitionForComponent(registry, comp);
  const zone = zoneForComponent(comp);
  const unitBadges = Object.entries(comp.params).map(([paramName, spec]) => ({
    name: spec.label ?? paramName,
    unit: spec.unit || "—",
    description: spec.description ?? paramName,
  }));
  return <aside className="component-inspector light-inspector compact-physics-inspector" data-testid="component-inspector">
    <div className="physics-inspector-main">
      <div className="physics-component-head">
        <strong>{nickname(comp)}</strong>
        <span>{componentDisplayName(comp, language)}</span>
      </div>
      <div className="physics-badge-row">
        <span className="physics-badge physics-badge-zone">{zone === "main" ? (language === "zh" ? "主路" : "Main path") : (language === "zh" ? "分支" : "Branch")}</span>
        <span className="physics-badge">{componentRoleLabel(comp, language)}</span>
        {comp.polarity ? <span className="physics-badge">{polarityLabel(language, comp.polarity)}</span> : null}
      </div>
    </div>
    <div className="physics-equation-card">
      <span>{language === "zh" ? "当前控制方程" : "Current governing equation"}</span>
      <BlockMath math={componentEquation(comp)} />
      <small>{definition?.display_name ?? comp.function_type}</small>
    </div>
    <div className="physics-unit-list" aria-label={language === "zh" ? "参数单位" : "Parameter units"}>
      {unitBadges.map((item) => <span className="physics-badge physics-unit-badge" key={item.name} title={item.description}>
        <strong>{item.name}</strong><em>{item.unit}</em>
      </span>)}
    </div>
  </aside>;
}
