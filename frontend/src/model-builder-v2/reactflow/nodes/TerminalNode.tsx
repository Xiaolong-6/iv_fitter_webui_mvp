import { Handle, Position, type NodeProps } from "@xyflow/react";

export function TerminalNode({ data }: NodeProps) {
  const label = typeof data?.label === "string" ? data.label : "Terminal";
  const role = typeof data?.role === "string" ? data.role : "terminal";
  const isGround = role === "ground";
  return (
    <div className={`mbv2-terminal-node ${isGround ? "is-ground" : "is-positive"}`}>
      {!isGround ? <Handle type="source" position={Position.Right} id="node" className="mbv2-handle" /> : null}
      {isGround ? <Handle type="target" position={Position.Left} id="node" className="mbv2-handle" /> : null}
      <div className="mbv2-terminal-dot" />
      <div>
        <div className="mbv2-terminal-label">{label}</div>
        <div className="mbv2-terminal-subtitle">{isGround ? "V = 0" : "external voltage"}</div>
      </div>
    </div>
  );
}
