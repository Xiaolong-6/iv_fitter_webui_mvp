import { BaseEdge, EdgeLabelRenderer, type EdgeProps } from "@xyflow/react";

function buildOrthogonalPath(sourceX: number, sourceY: number, targetX: number, targetY: number): [string, number, number] {
  if (Math.abs(sourceY - targetY) < 2 || Math.abs(sourceX - targetX) < 2) {
    return [`M ${sourceX} ${sourceY} L ${targetX} ${targetY}`, (sourceX + targetX) / 2, (sourceY + targetY) / 2];
  }
  const midX = (sourceX + targetX) / 2;
  return [`M ${sourceX} ${sourceY} L ${midX} ${sourceY} L ${midX} ${targetY} L ${targetX} ${targetY}`, midX, (sourceY + targetY) / 2];
}

export function OrthogonalWireEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, selected, data } = props;
  const [path, labelX, labelY] = buildOrthogonalPath(sourceX, sourceY, targetX, targetY);
  const inactive = data?.active === false;
  const onDelete = typeof data?.onDelete === "function" ? data.onDelete as (id: string) => void : null;
  return (
    <>
      <BaseEdge id={id} path={path} className={`mbv2-wire-edge ${selected ? "is-selected" : ""} ${inactive ? "is-inactive" : ""}`} />
      {selected && onDelete ? (
        <EdgeLabelRenderer>
          <button
            className="mbv2-edge-delete nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            type="button"
            onClick={(event) => { event.stopPropagation(); onDelete(id); }}
          >
            ×
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
