import { useMemo, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { MathFormula } from "../MathFormula";
import { nickname, type BuilderBucket } from "../../model-builder/rules";
import {
  componentDisplayName,
  definitionsForBucket,
  functionOptionLabel,
  polarityLabel,
  zoneForComponent,
} from "./modelHelpers";
import { isPolarityMeaningful } from "../../model/modelDisplaySemantics";
import type { ModelFlowNodeData } from "./types";
import { useModelFlowContext } from "./flowContext";

const centerHandleStyle = { top: "50%", transform: "translateY(-50%)" };

export function ModelTerminalNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const role = data.role ?? "vi";
  return <div className={`xy-model-terminal xy-model-terminal-${role}`}>
    {role === "vext" ? <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out" style={centerHandleStyle} /> : null}
    {role === "ground" ? <Handle type="target" position={Position.Left} id="in" className="xy-port xy-port-in" style={centerHandleStyle} /> : null}
    <span className="xy-terminal-dot" aria-hidden="true" />
    <strong>{data.label}</strong>
    {data.subtitle ? <small>{data.subtitle}</small> : null}
  </div>;
}

export function ModelJunctionNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const pathYs = data.pathYPositions ?? [0];
  const top = data.nodeTopY ?? Math.min(...pathYs);
  const height = Math.max(14, Math.max(...pathYs) - top + 14);
  return <div className="xy-junction-node" aria-label={data.label} style={{ height }}>
    {pathYs.map((y) => {
      const rel = y - top;
      return <span key={`dot-${y}`} className="xy-junction-branch-dot" aria-hidden="true" style={{ top: rel }} />;
    })}
    {pathYs.map((y) => {
      const rel = y - top;
      return <Handle key={`in-${y}`} type="target" position={Position.Left} id={`in-${y}`} className="xy-port xy-port-in xy-junction-port" style={{ top: rel, transform: "translateY(-50%)" }} />;
    })}
    {pathYs.map((y) => {
      const rel = y - top;
      return <Handle key={`out-${y}`} type="source" position={Position.Right} id={`out-${y}`} className="xy-port xy-port-out xy-junction-port" style={{ top: rel, transform: "translateY(-50%)" }} />;
    })}
  </div>;
}

function bucketLabel(bucket: BuilderBucket, language: "en" | "zh") {
  if (bucket === "main") return language === "zh" ? "+ Series component" : "+ Series component";
  return language === "zh" ? "+ Add parallel path" : "+ Add parallel path";
}

export function ModelActionNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const bucket = data.actionBucket ?? "branches";
  const { registry, language, disabled, readOnly, selectedDefinitions, setAddDefinition, addAt } = useModelFlowContext();
  const [expanded, setExpanded] = useState(false);
  const definitions = useMemo(() => definitionsForBucket(registry, bucket), [bucket, registry]);
  const selectedValue = selectedDefinitions[bucket] ?? definitions[0]?.function_type ?? "";
  const disabledAction = Boolean(disabled || readOnly || !definitions.length);

  function stop(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  function choose(functionType: string) {
    setAddDefinition(bucket, functionType);
    addAt({ bucket, functionType, mode: data.actionMode ?? "parallel", pathId: data.actionPathId, insertIndex: data.actionInsertIndex });
    setExpanded(false);
  }

  const isParallelAction = (data.actionMode ?? "parallel") === "parallel";
  const actionLabel = bucketLabel(bucket, language);

  return <div className={`xy-action-node xy-action-node-floating ${isParallelAction ? "xy-action-node-parallel" : "xy-action-node-serial"}`} onClick={stop} onPointerDown={stop} onKeyDown={stop}>
    <Handle type="target" position={Position.Left} id="in" className="xy-hidden-handle" />
    <button
      type="button"
      className={`xy-action-node-button ${isParallelAction ? "xy-action-node-pill" : "xy-action-node-plus-only"}`}
      disabled={disabledAction}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      title={actionLabel}
      onClick={(event) => { event.stopPropagation(); setExpanded((value) => !value); }}
    >{isParallelAction ? actionLabel : "+"}</button>
    <Handle type="source" position={Position.Right} id="out" className="xy-hidden-handle" />
    {expanded ? <div className="xy-action-node-popover" role="dialog" aria-label={actionLabel}>
      <div className="xy-action-node-popover-head">
        <strong>{actionLabel}</strong>
        <span>{language === "zh" ? "Choose component behavior" : "Choose component behavior"}</span>
      </div>
      <div className="xy-action-node-option-list">
        {definitions.map((definition) => {
          const label = functionOptionLabel(definition, language, bucket);
          const active = definition.function_type === selectedValue;
          return <button key={definition.function_type} type="button" className={active ? "is-active" : ""} title={label} onClick={(event) => { event.stopPropagation(); choose(definition.function_type); }}>{label}</button>;
        })}
      </div>
    </div> : null}
  </div>;
}

function behaviorBadge(comp: NonNullable<ModelFlowNodeData["refItem"]>["comp"], zone: BuilderBucket) {
  const behavior = String(comp.metadata?.behavior ?? "");
  if (behavior === "R_of_V") return "R(V)";
  if (behavior === "I_of_V") return "I(V)";
  if (behavior === "dV_of_I") return "dV(I)";
  if (behavior === "custom_residual") return "F=0";
  if (comp.law_id === "ohmic") return "R(V)";
  if (comp.function_type === "diode") return "I(V)";
  return zone === "main" ? "dV(I)" : "I(V)";
}

export function ModelComponentNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const refItem = data.refItem;
  const { language, readOnly, removeById, addLocalParallelById } = useModelFlowContext();
  const [hovered, setHovered] = useState(false);
  if (!refItem) return null;
  const { comp } = refItem;
  const zone = zoneForComponent(comp);
  const showPolarity = comp.polarity && isPolarityMeaningful(comp);
  const polarity = showPolarity ? polarityLabel(language, comp.polarity!) : null;
  const displayName = componentDisplayName(comp, language);
  return <div
    role="button"
    tabIndex={0}
    className={`xy-component-node xy-component-node-${zone} ${data.compact ? "is-compact" : ""} ${data.selected ? "is-selected" : ""} ${(hovered || data.selected) ? "is-local-parallel-target" : ""}`}
    data-component-id={comp.id}
    title={`${nickname(comp)} - ${displayName}`}
    onMouseEnter={() => setHovered(true)}
    onMouseLeave={() => setHovered(false)}
    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") event.currentTarget.click(); }}
  >
    <Handle type="target" position={Position.Left} id="in" className="xy-port xy-port-in" style={centerHandleStyle} />
    {!readOnly ? <span role="button" tabIndex={0} className="xy-node-delete" title={language === "zh" ? `Remove ${nickname(comp)}` : `Remove ${nickname(comp)}`} onClick={(event) => { event.stopPropagation(); removeById(comp.id); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); removeById(comp.id); } }}>x</span> : null}
    <span className="xy-node-symbol" aria-hidden="true">{behaviorBadge(comp, zone).slice(0, 1)}</span>
    <span className="xy-node-body">
      <strong>{nickname(comp)}</strong>
      <small title={displayName}>{displayName}</small>
      <span className="xy-node-badges" aria-hidden="true">
        {polarity ? <span>{polarity}</span> : null}
        <span>{behaviorBadge(comp, zone)}</span>
      </span>
    </span>
    {!readOnly ? <div className="xy-component-local-parallel-guide" aria-hidden="true">
      <button
        type="button"
        className="xy-component-local-parallel-button"
        title={language === "zh" ? "Add local parallel subcircuit around this component" : "Add local parallel subcircuit around this component"}
        aria-label={language === "zh" ? "Add local parallel subcircuit" : "Add local parallel subcircuit"}
        onClick={(event) => {
          event.stopPropagation();
          addLocalParallelById(comp.id);
        }}
      >+</button>
    </div> : null}
    <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out" style={centerHandleStyle} />
  </div>;
}

export function ModelAnnotationNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const latex = data.latex ?? data.label;
  const tone = data.annotationTone ?? "global";
  return <div className={`xy-model-annotation xy-model-annotation-${tone}`} aria-hidden="true">
    {data.annotationTitle ? <span className="xy-model-annotation-title">{data.annotationTitle}</span> : null}
    <MathFormula latex={latex} inline className="xy-model-annotation-formula" />
  </div>;
}

export const nodeTypes = {
  modelTerminal: ModelTerminalNode,
  modelComponent: ModelComponentNode,
  modelAction: ModelActionNode,
  modelJunction: ModelJunctionNode,
  modelAnnotation: ModelAnnotationNode,
};
