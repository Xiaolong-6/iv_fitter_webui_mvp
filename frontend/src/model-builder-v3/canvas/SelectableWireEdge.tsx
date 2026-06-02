import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

type Mb3EdgeData = {
  onDeleteWire?: (wireId: string) => void;
};

export function SelectableWireEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  selected,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const payload = (data ?? {}) as Mb3EdgeData;

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      {selected ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="mbv3-edge-delete"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={(event) => {
              event.stopPropagation();
              payload.onDeleteWire?.(id);
            }}
            title="Delete wire"
            aria-label="Delete wire"
          >
            x
          </button>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
