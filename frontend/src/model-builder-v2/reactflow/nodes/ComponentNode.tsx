import { Handle, Position, type NodeProps } from "@xyflow/react";
import { behaviorLabel } from "../../domain/componentCatalog";
import type { ComponentBehavior } from "../../domain/schematicTypes";

export function ComponentNode({ data, selected }: NodeProps) {
  const label = typeof data?.label === "string" ? data.label : "Component";
  const behavior = (typeof data?.behavior === "string" ? data.behavior : "R_of_V") as ComponentBehavior;
  const presetLabel = typeof data?.presetLabel === "string" ? data.presetLabel : "Custom";
  const active = data?.active !== false;
  return (
    <div className={`mbv2-component-node ${selected ? "is-selected" : ""} ${!active ? "is-inactive" : ""}`} data-component-id={data?.componentId}>
      <Handle type="target" position={Position.Left} id="p" className="mbv2-handle mbv2-component-handle" />
      <Handle type="source" position={Position.Right} id="n" className="mbv2-handle mbv2-component-handle" />
      <div className="mbv2-component-chip">{behaviorLabel(behavior)}</div>
      <div className="mbv2-component-main">
        <div className="mbv2-component-title">{label}</div>
        <div className="mbv2-component-subtitle">{presetLabel}</div>
      </div>
      {!active ? <div className="mbv2-inactive-badge">ignored</div> : null}
    </div>
  );
}
