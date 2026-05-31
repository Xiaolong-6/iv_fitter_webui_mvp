import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import { allRefsForZone, aggregateCurrentEquation, aggregateVoltageEquation, componentEquation } from "./modelHelpers";
import type { CircuitEdge, CircuitEdgeData, FlowGraph, ModelFlowNodeData } from "./types";

const WIRE_STROKE = "#111827";
const WIRE_STROKE_SELECTED = "#0f172a";

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
  data?: CircuitEdgeData,
  route: "main" | "branch" = "main",
  highlight?: "main" | "branch" | null,
): CircuitEdge {
  const highlightClass = highlight ? "is-edge-linked-to-selected" : "";
  const isActionEdge = Boolean(data?.addBucket);
  const stroke = highlight ? WIRE_STROKE_SELECTED : WIRE_STROKE;
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: isActionEdge ? "circuitButton" : route === "main" ? "straight" : "smoothstep",
    className: `xy-model-edge xy-circuit-wire xy-circuit-wire-${route} ${isActionEdge ? "xy-insertable-edge" : ""} ${highlightClass}`.trim(),
    data: { ...(data ?? {}), route },
    markerEnd: isActionEdge ? undefined : { type: MarkerType.ArrowClosed, color: stroke, width: 12, height: 12 },
    style: { strokeWidth: highlight ? 2.75 : 2.15, stroke },
  };
}

export function buildFlowGraph(
  model: ModelSpec,
  selectedId: string | null,
  language: Language,
  options: { readOnly?: boolean; disabled?: boolean; registry?: unknown[]; selectedDefinitions?: Record<string, string> } = {},
): FlowGraph {
  void options;
  const mainRefs = allRefsForZone(model, "main");
  const branchRefs = allRefsForZone(model, "branches");
  const branchCount = Math.max(1, branchRefs.length);
  const branchPortCount = branchCount;
  const compactMain = mainRefs.length >= 3;

  // Layout is expressed in React Flow node top-left coordinates. Keep the
  // circuit compact and slightly above visual center so inline equation
  // annotations can sit near the topology without taking over the canvas.
  const mainGap = mainRefs.length >= 7 ? 190 : mainRefs.length >= 5 ? 215 : mainRefs.length >= 3 ? 250 : 270;
  const mainY = 148;
  const terminalHeight = 54;
  const componentHeight = 72;
  const terminalY = mainY + (componentHeight - terminalHeight) / 2;
  const actionY = mainY - 54;
  const startX = 120;
  const firstMainX = 300;
  const terminalW = 116;
  const viX = firstMainX + Math.max(mainRefs.length, 1) * mainGap + 72;

  const branchGapY = 104;
  const branchX = viX + 228;
  const branchStartY = mainY - ((branchCount - 1) * branchGapY) / 2;
  const groundX = branchX + 265;
  const groundY = mainY;

  const branchYPositions = branchRefs.map((_, index) => branchStartY + index * branchGapY);

  const nodes: Node<ModelFlowNodeData>[] = [
    { id: "terminal:vext", type: "modelTerminal", position: { x: startX, y: terminalY }, data: { kind: "terminal", role: "vext", label: "Vext" }, draggable: false, selectable: false },
    { id: "terminal:vi", type: "modelTerminal", position: { x: viX, y: terminalY }, data: { kind: "terminal", role: "vi", label: "Vi", branchPortCount, branchYPositions }, draggable: false, selectable: false },
    { id: "terminal:ground", type: "modelTerminal", position: { x: groundX, y: terminalY }, data: { kind: "terminal", role: "ground", label: "V=0", branchPortCount, branchYPositions }, draggable: false, selectable: false },
    { id: "annotation:voltage", type: "modelAnnotation", position: { x: Math.max(firstMainX + 70, viX - 230), y: mainY + 122 }, data: { kind: "annotation", label: "Voltage balance", latex: aggregateVoltageEquation(), annotationTone: "global", annotationTitle: language === "zh" ? "电压平衡" : "Voltage balance" }, draggable: false, selectable: false },
    { id: "annotation:current", type: "modelAnnotation", position: { x: branchX + 70, y: branchStartY - 74 }, data: { kind: "annotation", label: "Branch current sum", latex: aggregateCurrentEquation(), annotationTone: "global", annotationTitle: language === "zh" ? "支路电流和" : "Branch current sum" }, draggable: false, selectable: false },
  ];

  if (!options.readOnly) {
    nodes.push(
      {
        id: "action:add-main",
        type: "modelAction",
        position: { x: startX + terminalW + 32, y: actionY },
        data: { kind: "action", actionBucket: "main", label: language === "zh" ? "+ 主路项" : "+ Main term" },
        draggable: false,
        selectable: false,
      },
      {
        id: "action:add-branch",
        type: "modelAction",
        position: { x: viX + terminalW + 34, y: branchStartY - 72 },
        data: { kind: "action", actionBucket: "branches", label: language === "zh" ? "+ 支路" : "+ Branch" },
        draggable: false,
        selectable: false,
      },
    );
  }

  if (branchRefs.length) {
    nodes.push(
      {
        id: "junction:vi-split",
        type: "modelJunction",
        position: { x: viX + terminalW + 88, y: branchStartY },
        data: { kind: "junction", label: language === "zh" ? "分流结点" : "split junction", branchPortCount, branchYPositions },
        draggable: false,
        selectable: false,
      },
      {
        id: "junction:ground-merge",
        type: "modelJunction",
        position: { x: branchX + 220, y: branchStartY },
        data: { kind: "junction", label: language === "zh" ? "合流结点" : "merge junction", branchPortCount, branchYPositions },
        draggable: false,
        selectable: false,
      },
    );
  }

  mainRefs.forEach((refItem, index) => {
    nodes.push({
      id: `component:${refItem.comp.id}`,
      type: "modelComponent",
      position: { x: firstMainX + index * mainGap, y: mainY },
      data: { kind: "component", label: refItem.comp.id, refItem, selected: selectedId === refItem.comp.id, language, compact: compactMain },
      draggable: false,
      selectable: true,
    });
  });

  branchRefs.forEach((refItem, index) => {
    nodes.push({
      id: `component:${refItem.comp.id}`,
      type: "modelComponent",
      position: { x: branchX, y: branchStartY + index * branchGapY },
      data: { kind: "component", label: refItem.comp.id, refItem, selected: selectedId === refItem.comp.id, language, compact: compactMain },
      draggable: false,
      selectable: true,
    });
  });

  // Component-level governing equations live in the inspector.
  // Keeping them off the canvas avoids cramped overlaps around selected nodes.


  const edges: CircuitEdge[] = [];

  const hl = (componentId: string): "main" | "branch" | null => {
    if (!selectedId || selectedId !== componentId) return null;
    return branchRefs.some((r) => r.comp.id === componentId) ? "branch" : "main";
  };

  if (mainRefs.length) {
    edges.push(edge("edge:vext-main0", "terminal:vext", `component:${mainRefs[0].comp.id}`, "out", "in", undefined, "main", hl(mainRefs[0].comp.id)));
    mainRefs.forEach((refItem, index) => {
      const next = mainRefs[index + 1];
      edges.push(edge(
        `edge:main-${refItem.comp.id}-${next?.comp.id ?? "vi"}`,
        `component:${refItem.comp.id}`,
        next ? `component:${next.comp.id}` : "terminal:vi",
        "out",
        "in",
        undefined,
        "main",
        hl(refItem.comp.id) ?? (next ? hl(next.comp.id) : null),
      ));
    });
  } else {
    edges.push(edge("edge:vext-vi", "terminal:vext", "terminal:vi", "out", "in", undefined, "main"));
  }

  if (branchRefs.length) {
    branchRefs.forEach((refItem, index) => {
      const branchHl = hl(refItem.comp.id);
      edges.push(edge(`edge:vi-${refItem.comp.id}`, "terminal:vi", `component:${refItem.comp.id}`, `branch-out-${index}`, "in", undefined, "branch", branchHl));
      edges.push(edge(`edge:${refItem.comp.id}-ground`, `component:${refItem.comp.id}`, "terminal:ground", "out", `branch-in-${index}`, undefined, "branch", branchHl));
    });
  } else {
    edges.push(edge("edge:vi-ground-empty-branches", "terminal:vi", "terminal:ground", "branch-out-0", "branch-in-0", undefined, "branch"));
  }
  return { nodes, edges };
}

export type { ModelFlowNodeData, CircuitEdge };
