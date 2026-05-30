import type { Edge, Node } from "@xyflow/react";
import type { ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket } from "../../model-builder/rules";
import { allRefsForZone } from "./modelHelpers";
import type { CircuitEdge, CircuitEdgeData, FlowGraph, ModelFlowNodeData } from "./types";

function edge(id: string, source: string, target: string, sourceHandle?: string, targetHandle?: string, data?: CircuitEdgeData, route: "main" | "branch" = "main"): CircuitEdge {
  const stroke = route === "branch" ? "#7c3aed" : "#2563eb";
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: data?.addBucket ? "circuitButton" : "smoothstep",
    className: `xy-model-edge xy-circuit-wire xy-circuit-wire-${route} ${data?.addBucket ? "xy-insertable-edge" : ""}`,
    data: { ...(data ?? {}), route },
    style: { strokeWidth: route === "branch" ? 2.2 : 2.4, stroke },
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
  const mainGap = mainRefs.length >= 7 ? 145 : mainRefs.length >= 5 ? 165 : mainRefs.length >= 3 ? 190 : 260;
  const branchGapY = 96;
  const mainY = 170;
  const startX = 120;
  const firstMainX = 300;
  const viX = firstMainX + Math.max(mainRefs.length, 1) * mainGap + 70;
  const branchX = viX + 210;
  const branchStartY = mainY + 104;
  const groundX = branchX + 250;
  const groundY = branchStartY + ((branchCount - 1) * branchGapY) / 2;

  const nodes: Node<ModelFlowNodeData>[] = [
    { id: "terminal:vext", type: "modelTerminal", position: { x: startX, y: mainY }, data: { kind: "terminal", role: "vext", label: "Vext", subtitle: language === "zh" ? "外加偏压" : "external" }, draggable: false, selectable: false },
    { id: "terminal:vi", type: "modelTerminal", position: { x: viX, y: mainY }, data: { kind: "terminal", role: "vi", label: "Vi", subtitle: language === "zh" ? "内结点" : "internal node", branchPortCount }, draggable: false, selectable: false },
    { id: "terminal:ground", type: "modelTerminal", position: { x: groundX, y: groundY }, data: { kind: "terminal", role: "ground", label: "V=0", subtitle: language === "zh" ? "参考端" : "reference", branchPortCount }, draggable: false, selectable: false },
  ];

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

  const addData = (bucket: BuilderBucket): CircuitEdgeData => ({ addBucket: bucket });
  const edges: CircuitEdge[] = [];
  if (mainRefs.length) {
    edges.push(edge("edge:vext-main0", "terminal:vext", `component:${mainRefs[0].comp.id}`, "out", "in"));
    mainRefs.forEach((refItem, index) => {
      const next = mainRefs[index + 1];
      edges.push(edge(
        `edge:main-${refItem.comp.id}-${next?.comp.id ?? "vi"}`,
        `component:${refItem.comp.id}`,
        next ? `component:${next.comp.id}` : "terminal:vi",
        "out",
        "in",
        !next ? addData("main") : undefined,
      ));
    });
  } else {
    edges.push(edge("edge:vext-vi", "terminal:vext", "terminal:vi", "out", "in", addData("main")));
  }

  if (branchRefs.length) {
    branchRefs.forEach((refItem, index) => {
      edges.push(edge(`edge:vi-${refItem.comp.id}`, "terminal:vi", `component:${refItem.comp.id}`, `branch-out-${index}`, "in", index === 0 ? addData("branches") : undefined, "branch"));
      edges.push(edge(`edge:${refItem.comp.id}-ground`, `component:${refItem.comp.id}`, "terminal:ground", "out", `branch-in-${index}`, undefined, "branch"));
    });
  } else {
    edges.push(edge("edge:vi-ground-empty-branches", "terminal:vi", "terminal:ground", "branch-out-0", "branch-in-0", addData("branches"), "branch"));
  }
  return { nodes, edges };
}

export type { ModelFlowNodeData, CircuitEdge };
