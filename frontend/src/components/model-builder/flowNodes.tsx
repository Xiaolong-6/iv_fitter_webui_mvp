import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { nickname } from "../../model-builder/rules";
import {
  componentDisplayName,
  polarityLabel,
  zoneForComponent,
} from "./modelHelpers";
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
  return <div className={`xy-model-terminal xy-model-terminal-${role}`}>
    {role === "vext" ? <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out" style={centerHandleStyle} /> : null}
    {role === "vi" ? <>
      <Handle type="target" position={Position.Left} id="in" className="xy-port xy-port-in" style={centerHandleStyle} />
      <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out xy-port-main-out" style={centerHandleStyle} />
      {Array.from({ length: branchPortCount }, (_, index) => (
        <Handle
          key={`branch-out-${index}`}
          type="source"
          position={Position.Right}
          id={`branch-out-${index}`}
          className="xy-port xy-port-out xy-port-branch-out xy-branch-port"
          style={{ top: `${distributedPortTop(index, branchPortCount)}%`, transform: "translateY(-50%)" }}
        />
      ))}
    </> : null}
    {role === "ground" ? Array.from({ length: branchPortCount }, (_, index) => (
      <Handle
        key={`branch-in-${index}`}
        type="target"
        position={Position.Left}
        id={`branch-in-${index}`}
        className="xy-port xy-port-in xy-port-ground-in xy-branch-port"
        style={{ top: `${distributedPortTop(index, branchPortCount)}%`, transform: "translateY(-50%)" }}
      />
    )) : null}
    <strong>{data.label}</strong>
    {data.subtitle ? <small>{data.subtitle}</small> : null}
  </div>;
}

export function ModelComponentNode({ data }: NodeProps<Node<ModelFlowNodeData>>) {
  const refItem = data.refItem;
  const { language, readOnly, removeById } = useModelFlowContext();
  if (!refItem) return null;
  const { comp } = refItem;
  const zone = zoneForComponent(comp);
  const polarity = comp.polarity ? polarityLabel(language, comp.polarity) : null;
  const roleBadge = zone === "main" ? "ΔV" : "I(Vi)";
  return <div
    role="button"
    tabIndex={0}
    className={`xy-component-node xy-component-node-${zone} ${data.compact ? "is-compact" : ""} ${data.selected ? "is-selected" : ""}`}
    data-component-id={comp.id}
    title={`${nickname(comp)} · ${componentDisplayName(comp, language)}`}
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
      <small>{componentDisplayName(comp, language)}</small>
      <span className="xy-node-badges" aria-hidden="true">
        {polarity ? <span>{polarity}</span> : null}
        <span>{roleBadge}</span>
      </span>
    </span>
    <Handle type="source" position={Position.Right} id="out" className="xy-port xy-port-out" style={centerHandleStyle} />
  </div>;
}

export const nodeTypes = {
  modelTerminal: ModelTerminalNode,
  modelComponent: ModelComponentNode,
};
