import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { useRef, type PointerEvent } from "react";
import type { Mb3Point } from "../domain/types";

type Mb3EdgeData = {
  onDeleteWire?: (wireId: string) => void;
  onUpdateWireRoute?: (wireId: string, routePoints: Mb3Point[]) => void;
  routePoints?: Mb3Point[];
  zoom?: number;
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

function segmentMidpoint(a: Mb3Point, b: Mb3Point): Mb3Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isHorizontal(a: Mb3Point, b: Mb3Point): boolean {
  return Math.abs(a.y - b.y) <= Math.abs(a.x - b.x);
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
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    segmentIndex: number;
    points: Mb3Point[];
    horizontal: boolean;
  } | null>(null);
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
  const editableSegments = hasRoute
    ? payload.routePoints!
        .slice(0, -1)
        .map((point, index) => ({ a: point, b: payload.routePoints![index + 1], index }))
        .filter(({ index }) => index > 0 && index < payload.routePoints!.length - 2)
    : [];

  const startSegmentDrag = (
    event: PointerEvent<HTMLButtonElement>,
    segmentIndex: number,
    horizontal: boolean,
  ) => {
    if (!payload.routePoints || !payload.onUpdateWireRoute) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      segmentIndex,
      points: payload.routePoints.map((point) => ({ ...point })),
      horizontal,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveSegmentDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    const zoom = payload.zoom && Number.isFinite(payload.zoom) ? payload.zoom : 1;
    const delta = drag.horizontal
      ? (event.clientY - drag.startY) / zoom
      : (event.clientX - drag.startX) / zoom;
    const next = drag.points.map((point) => ({ ...point }));
    const aIndex = drag.segmentIndex;
    const bIndex = drag.segmentIndex + 1;
    if (drag.horizontal) {
      next[aIndex].y += delta;
      next[bIndex].y += delta;
    } else {
      next[aIndex].x += delta;
      next[bIndex].x += delta;
    }
    payload.onUpdateWireRoute?.(id, next);
  };

  const endSegmentDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

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
          {editableSegments.map(({ a, b, index }) => {
            const midpoint = segmentMidpoint(a, b);
            const horizontal = isHorizontal(a, b);
            return (
              <button
                key={`${id}-segment-${index}`}
                type="button"
                className={[
                  "mbv3-wire-segment-handle",
                  horizontal ? "is-horizontal" : "is-vertical",
                ].join(" ")}
                style={{ transform: `translate(-50%, -50%) translate(${midpoint.x}px, ${midpoint.y}px)` }}
                onPointerDown={(event) => startSegmentDrag(event, index, horizontal)}
                onPointerMove={moveSegmentDrag}
                onPointerUp={endSegmentDrag}
                onPointerCancel={endSegmentDrag}
                title={horizontal ? "Drag this horizontal wire segment up/down" : "Drag this vertical wire segment left/right"}
                aria-label="Drag wire segment"
              />
            );
          })}
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
