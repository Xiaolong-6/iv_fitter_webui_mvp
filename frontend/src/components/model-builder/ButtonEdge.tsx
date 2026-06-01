import { useEffect, useMemo, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getStraightPath, type EdgeProps } from "@xyflow/react";
import { buildPendingComponent } from "../../model-builder/mutations";
import { isDuplicateBlocked } from "../../model-builder/rules";
import { t } from "../../model/i18n";
import {
  addPolarityFor,
  addableDefinitionForBucket,
  definitionsForBucket,
  functionOptionLabel,
} from "./modelHelpers";
import type { CircuitEdge } from "./types";
import { useModelFlowContext } from "./flowContext";

export function ButtonEdge(props: EdgeProps<CircuitEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, style, markerEnd, data } = props;
  const [open, setOpen] = useState(false);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { language, disabled, readOnly, registry, model, selectedDefinitions, addAt } = useModelFlowContext();
  const routePoints = Array.isArray(data?.routePoints) ? data.routePoints as Array<{ x: number; y: number }> : undefined;
  const [straightPath, straightLabelX, straightLabelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  const edgePath = routePoints && routePoints.length >= 2
    ? routePoints.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ")
    : straightPath;
  const labelPoint = routePoints && routePoints.length >= 2
    ? routePoints[Math.floor(routePoints.length / 2)]
    : undefined;
  const labelX = labelPoint?.x ?? straightLabelX;
  const labelY = labelPoint?.y ?? straightLabelY;
  const bucket = data?.addBucket;
  const addMode = data?.addMode ?? "serial";
  const pathId = typeof data?.pathId === "string" ? data.pathId : undefined;
  const insertIndex = typeof data?.insertIndex === "number" ? data.insertIndex : undefined;

  const definitions = useMemo(() => bucket ? definitionsForBucket(registry, bucket) : [], [bucket, registry]);
  const selectedType = bucket ? (localChoice ?? selectedDefinitions[bucket]) : undefined;
  const definition = bucket
    ? (selectedType ? definitions.find((item) => item.function_type === selectedType) : addableDefinitionForBucket(model, definitions, bucket, undefined))
    : definitions[0];
  // Direct branch graph permits repeated component behavior on different paths.
  // Keep the legacy duplicate helper imported for compatibility, but do not block insertion here.
  void buildPendingComponent;
  void isDuplicateBlocked;
  const duplicateBlocked = false;

  useEffect(() => {
    if (open && bucket && !localChoice) setLocalChoice(selectedDefinitions[bucket] ?? definition?.function_type ?? null);
    if (!open) return undefined;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Element)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [bucket, definition?.function_type, localChoice, open, selectedDefinitions]);

  const title = addMode === "parallel"
    ? (language === "zh" ? "在同一对结点之间添加并联路径" : "Add a parallel path between these junctions")
    : (language === "zh" ? "在这条路径中串联插入元件" : "Insert a series component into this path");

  return <>
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
    {bucket && !readOnly ? <EdgeLabelRenderer>
      <div
        ref={rootRef}
        className={`xy-edge-action nodrag nopan xy-edge-action-${addMode} ${data?.emphasis === "primary" ? "is-primary-edge-action" : ""}` }
        style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="xy-edge-add-button"
          disabled={disabled || !definitions.length}
          title={title}
          aria-label={title}
          onClick={() => setOpen((value) => !value)}
        >+</button>
        {open ? <div className={`xy-edge-add-popover xy-edge-add-popover-${bucket}`} role="dialog" aria-label={title}>
          <div className="xy-edge-option-list" role="listbox">
            {definitions.map((item) => {
              const label = functionOptionLabel(item, language, bucket);
              const active = item.function_type === (definition?.function_type ?? "");
              return <button
                type="button"
                role="option"
                aria-selected={active}
                className={active ? "is-active" : ""}
                key={item.function_type}
                value={item.function_type}
                title={label}
                disabled={disabled}
                onClick={() => setLocalChoice(item.function_type)}
              >{label}</button>;
            })}
          </div>
          <button
            type="button"
            className="xy-edge-add-confirm"
            disabled={disabled || !definition || duplicateBlocked}
            title={duplicateBlocked ? (language === "zh" ? "已存在相同数学形式、位置和极性的模型项。" : "This law/form/placement/polarity is already present.") : t(language, "addComponentHelp")}
            onClick={() => {
              if (definition && bucket) addAt({ bucket, functionType: definition.function_type, mode: addMode, pathId, insertIndex });
              setOpen(false);
              setLocalChoice(null);
            }}
          >{language === "zh" ? "添加" : "Add"}</button>
        </div> : null}
      </div>
    </EdgeLabelRenderer> : null}
  </>;
}

export const edgeTypes = { circuitButton: ButtonEdge };
