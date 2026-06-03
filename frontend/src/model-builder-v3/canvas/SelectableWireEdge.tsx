import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import type { Mb3Point } from "./routing";

type Mb3EdgeData = {
  onDeleteWire?: (wireId: string) => void;
  routePoints?: Mb3Point[];
};

function orthogonalPath(points: Mb3Point[]): string {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(" ")}`;
}

function routeMidpoint(points: Mb3Point[], fallbackX: number, fallbackY: number): Mb3Point {
  if (points.length < 2) return { x: fallbackX, y: fallbackY };
  const lengths = points.slice(0, -1).map((point, index) =>
    Math.abs(point.x - points[index + 1].x) + Math.abs(point.y - points[index + 1].y),
  );
  const total = lengths.reduce((sum, length) => sum + length, 0);
  if (total <= 0) return { x: fallbackX, y: fallbackY };
  let remaining = total / 2;
  for (let index = 0; index < lengths.length; index += 1) {
    const length = lengths[index];
    if (remaining <= length) {
      const a = points[index];
      const b = points[index + 1];
      const ratio = length === 0 ? 0 : remaining / length;
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
      };
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

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
  const hasRoute = Boolean(payload.routePoints && payload.routePoints.length >= 2);
  const path = hasRoute ? orthogonalPath(payload.routePoints!) : edgePath;
  const labelPoint = hasRoute ? routeMidpoint(payload.routePoints!, labelX, labelY) : { x: labelX, y: labelY };

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
      {selected ? (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="mbv3-edge-delete"
            style={{ transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)` }}
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
