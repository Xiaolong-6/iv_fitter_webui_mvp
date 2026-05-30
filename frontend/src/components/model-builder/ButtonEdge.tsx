import { useEffect, useMemo, useRef, useState } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
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
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data } = props;
  const [open, setOpen] = useState(false);
  const [localChoice, setLocalChoice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const { language, disabled, readOnly, registry, model, selectedDefinitions, addFrom } = useModelFlowContext();
  const [edgePath, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, borderRadius: 8, offset: 84 });
  const bucket = data?.addBucket;

  const definitions = useMemo(() => bucket ? definitionsForBucket(registry, bucket) : [], [bucket, registry]);
  const selectedType = bucket ? (localChoice ?? selectedDefinitions[bucket]) : undefined;
  const definition = bucket
    ? (selectedType ? definitions.find((item) => item.function_type === selectedType) : addableDefinitionForBucket(model, definitions, bucket, undefined))
    : definitions[0];
  const pendingComponent = bucket && definition ? buildPendingComponent(model, bucket, definition, addPolarityFor(model, bucket, definition)) : null;
  const duplicateBlocked = pendingComponent ? isDuplicateBlocked(model, pendingComponent) : false;

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

  return <>
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
    {bucket && !readOnly ? <EdgeLabelRenderer>
      <div
        ref={rootRef}
        className="xy-edge-action nodrag nopan"
        style={{ transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)` }}
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="xy-edge-add-button"
          disabled={disabled || !definitions.length}
          title={bucket === "main" ? (language === "zh" ? "插入主路元件" : "Insert main-path component") : (language === "zh" ? "添加分支元件" : "Add branch component")}
          onClick={() => setOpen((value) => !value)}
        >+</button>
        {open ? <div className={`xy-edge-add-popover xy-edge-add-popover-${bucket}`} role="dialog" aria-label={bucket === "main" ? "Main-path component options" : "Branch component options"}>
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
            onClick={() => { if (definition) addFrom(bucket, definition.function_type); setOpen(false); setLocalChoice(null); }}
          >{language === "zh" ? "添加" : "Add"}</button>
        </div> : null}
      </div>
    </EdgeLabelRenderer> : null}
  </>;
}

export const edgeTypes = { circuitButton: ButtonEdge };
