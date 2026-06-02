import { Handle, Position, type NodeProps } from "@xyflow/react";

export function JunctionNode({ data }: NodeProps) {
  const active = data?.active === true;
  return (
    <div className={`mbv2-junction-node ${active ? "is-active" : ""}`} title="Junction">
      <Handle type="target" position={Position.Left} id="node-left" className="mbv2-junction-handle" />
      <Handle type="source" position={Position.Right} id="node-right" className="mbv2-junction-handle" />
      <Handle type="source" position={Position.Top} id="node-top" className="mbv2-junction-handle" />
      <Handle type="source" position={Position.Bottom} id="node-bottom" className="mbv2-junction-handle" />
      <span />
    </div>
  );
}
