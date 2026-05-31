import { useMemo, useState, type MouseEvent, type KeyboardEvent } from "react";
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

function distributedPortTop(index: number, count: number) {
  if (count <= 1) return 50;
  const span = Math.min(46, 18 + count * 9);
  const start = 50 - span / 2;
  return start + (span * index) / Math.max(1, count - 1);
}

const centerHandleStyle = { top: "50%", transform: "translateY(-50%)" };

export function ModelTerminalNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const role = data.role ?? "vi";
  const branchPortCount = Math.max(1, data.branchPortCount ?? 1);
  const branchYPositions = data.branchYPositions;
  const terminalY = 0;

  return <div className={`xy-model-terminal xy-model-terminal-${role}`}>
    {role === "vext" ? <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out" style={centerHandleStyle} /> : null}
    {role === "vi" ? <>
      <Handle type="target" position={Position.Left} id="in" className="xy-port xy-port-in" style={centerHandleStyle} />
      <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out xy-port-main-out" style={centerHandleStyle} />
      {Array.from({ length: branchPortCount }, (_, index) => {
        const yPos = branchYPositions?.[index];
        const style = yPos !== undefined
          ? { top: `${yPos - terminalY}px`, transform: "translateY(-50%)" }
          : { top: `${distributedPortTop(index, branchPortCount)}%`, transform: "translateY(-50%)" };
        return (
          <Handle
            key={`branch-out-${index}`}
            type="source"
            position={Position.Right}
            id={`branch-out-${index}`}
            className="xy-port xy-port-out xy-port-branch-out xy-branch-port"
            style={style}
          />
        );
      })}
    </> : null}
    {role === "ground" ? Array.from({ length: branchPortCount }, (_, index) => {
      const yPos = branchYPositions?.[index];
      const style = yPos !== undefined
        ? { top: `${yPos - terminalY}px`, transform: "translateY(-50%)" }
        : { top: `${distributedPortTop(index, branchPortCount)}%`, transform: "translateY(-50%)" };
      return (
        <Handle
          key={`branch-in-${index}`}
          type="target"
          position={Position.Left}
          id={`branch-in-${index}`}
          className="xy-port xy-port-in xy-port-ground-in xy-branch-port"
          style={style}
        />
      );
    }) : null}
    <strong>{data.label}</strong>
    {data.subtitle ? <small>{data.subtitle}</small> : null}
  </div>;
}

export function ModelJunctionNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const branchPortCount = Math.max(1, data.branchPortCount ?? 1);
  const branchYPositions = data.branchYPositions ?? [];
  const firstY = branchYPositions[0] ?? 0;
  const lastY = branchYPositions[branchYPositions.length - 1] ?? firstY;
  const height = Math.max(16, lastY - firstY + 1);
  const dotTops = branchYPositions.length
    ? branchYPositions.map((y) => y - firstY)
    : Array.from({ length: branchPortCount }, (_, index) => `${distributedPortTop(index, branchPortCount)}%`);
  return <div className="xy-junction-node" aria-label={data.label} style={{ height }}>
    <span className="xy-junction-dot" aria-hidden="true" />
    {dotTops.map((top, index) => (
      <span key={index} className="xy-junction-branch-dot" aria-hidden="true" style={{ top }} />
    ))}
  </div>;
}

function bucketLabel(bucket: BuilderBucket, language: "en" | "zh") {
  if (bucket === "main") return language === "zh" ? "+ 主路项" : "+ Main term";
  return language === "zh" ? "+ 支路" : "+ Branch";
}

function bucketTitle(bucket: BuilderBucket, language: "en" | "zh") {
  if (bucket === "main") return language === "zh" ? "在 Vext 后的主路径中插入串联/压降元件" : "Insert a main-path component after Vext";
  return language === "zh" ? "在 Vi 后的并联结点添加支路" : "Add a parallel branch after Vi";
}

export function ModelActionNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const bucket = data.actionBucket ?? "branches";
  const { registry, language, disabled, readOnly, selectedDefinitions, setAddDefinition, addFrom } = useModelFlowContext();
  const [expanded, setExpanded] = useState(false);
  const definitions = useMemo(() => definitionsForBucket(registry, bucket), [bucket, registry]);
  const selectedValue = selectedDefinitions[bucket] ?? definitions[0]?.function_type ?? "";
  const disabledAction = Boolean(disabled || readOnly || !definitions.length);

  function stop(event: MouseEvent | KeyboardEvent) {
    event.stopPropagation();
  }

  function choose(functionType: string) {
    setAddDefinition(bucket, functionType);
    addFrom(bucket, functionType);
    setExpanded(false);
  }

  return <div
    className={`xy-action-node xy-action-node-${bucket}`}
    aria-label={bucketTitle(bucket, language)}
    title={bucketTitle(bucket, language)}
    onClick={stop}
    onPointerDown={stop}
    onKeyDown={stop}
  >
    <button
      type="button"
      className="xy-action-node-button"
      disabled={disabledAction}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={(event) => {
        event.stopPropagation();
        setExpanded((value) => !value);
      }}
    >
      {bucketLabel(bucket, language)}
    </button>
    {expanded ? <div className="xy-action-node-popover" role="dialog" aria-label={bucketTitle(bucket, language)}>
      <div className="xy-action-node-popover-head">
        <strong>{bucketLabel(bucket, language)}</strong>
        <span>{bucket === "main"
          ? (language === "zh" ? "只显示主路径兼容模型" : "Main-path compatible models")
          : (language === "zh" ? "只显示并联支路兼容模型" : "Branch-current compatible models")}</span>
      </div>
      <div className="xy-action-node-option-list">
        {definitions.map((definition) => {
          const label = functionOptionLabel(definition, language, bucket);
          const active = definition.function_type === selectedValue;
          return <button
            key={definition.function_type}
            type="button"
            className={active ? "is-active" : ""}
            title={label}
            onClick={(event) => {
              event.stopPropagation();
              choose(definition.function_type);
            }}
          >{label}</button>;
        })}
      </div>
    </div> : null}
  </div>;
}

export function ModelComponentNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const refItem = data.refItem;
  const { language, readOnly, removeById } = useModelFlowContext();
  if (!refItem) return null;
  const { comp } = refItem;
  const zone = zoneForComponent(comp);
  const showPolarity = comp.polarity && isPolarityMeaningful(comp);
  const polarity = showPolarity ? polarityLabel(language, comp.polarity!) : null;
  const polarityTip = comp.polarity === "reverse"
    ? (language === "zh" ? "反向：符号约定与 Vi → 元件 → V=0 相反。" : "Reverse: sign convention is reversed from Vi → component → V=0.")
    : comp.polarity === "forward"
      ? (language === "zh" ? "正向：正支路电流沿 Vi → 元件 → V=0。" : "Forward: positive branch current follows Vi → component → V=0.")
      : (language === "zh" ? "对称：极性不改变符号约定。" : "Symmetric: polarity does not change the sign convention.");
  const roleBadge = zone === "main" ? "ΔV" : "I(Vi)";
  const displayName = componentDisplayName(comp, language);
  return <div
    role="button"
    tabIndex={0}
    className={`xy-component-node xy-component-node-${zone} ${data.compact ? "is-compact" : ""} ${data.selected ? "is-selected" : ""}`}
    data-component-id={comp.id}
    title={`${nickname(comp)} · ${displayName}`}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") event.currentTarget.click();
    }}
  >
    <Handle type="target" position={Position.Left} id="in" className="xy-port xy-port-in" style={centerHandleStyle} />
    {!readOnly ? <span
      role="button"
      tabIndex={0}
      className="xy-node-delete"
      title={language === "zh" ? `删除 ${nickname(comp)}` : `Remove ${nickname(comp)}`}
      onClick={(event) => { event.stopPropagation(); removeById(comp.id); }}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); removeById(comp.id); } }}
    >×</span> : null}
    <span className="xy-node-symbol" aria-hidden="true">{zone === "main" ? "◆" : "●"}</span>
    <span className="xy-node-body">
      <strong>{nickname(comp)}</strong>
      <small title={displayName}>{displayName}</small>
      <span className="xy-node-badges" aria-hidden="true">
        {polarity ? <span title={polarityTip}>{polarity}</span> : null}
        <span>{roleBadge}</span>
      </span>
    </span>
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
