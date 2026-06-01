import { type Edge, type Node } from "@xyflow/react";
import type { ComponentSpec, ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket } from "../../model-builder/rules";
import { allRefsForZone } from "./modelHelpers";
import type { CircuitEdge, CircuitEdgeData, ComponentRef, FlowGraph, ModelFlowNodeData } from "./types";

type CircuitPath = {
  id: string;
  bucket: BuilderBucket;
  refs: ComponentRef[];
};

const WIRE_STROKE = "#111827";
const WIRE_MUTED = "#2563eb";
const COMPONENT_W = 160;
const COMPONENT_H = 68;
const TERMINAL_W = 120;
const TERMINAL_H = 50;
const JUNCTION_W = 16;
const MAIN_Y = 270;
const BRANCH_GAP_Y = 110;
const SERIES_GAP_X = 92;
const LEFT_MARGIN_X = 120;
const TERMINAL_TO_FIRST_X = 170;
const JUNCTION_TO_BRANCH_X = 138;

function metadataNumber(comp: ComponentSpec, key: string, fallback: number) {
  const raw = comp.metadata?.[key];
  return typeof raw === "number" && Number.isFinite(raw) ? raw : fallback;
}

function pathIdFor(comp: ComponentSpec, bucket: BuilderBucket) {
  const raw = comp.metadata?.pathId;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (bucket === "main") return "path:main";
  return `path:${comp.id}`;
}

function refsToPaths(model: ModelSpec): { main: CircuitPath; branches: CircuitPath[] } {
  const mainRefs = allRefsForZone(model, "main");
  const branchRefs = allRefsForZone(model, "branches");
  const main: CircuitPath = { id: "path:main", bucket: "main", refs: [...mainRefs] };
  main.refs.sort((a, b) => metadataNumber(a.comp, "pathOrder", mainRefs.indexOf(a)) - metadataNumber(b.comp, "pathOrder", mainRefs.indexOf(b)));

  const byPath = new Map<string, ComponentRef[]>();
  branchRefs.forEach((ref, index) => {
    const id = pathIdFor(ref.comp, "branches");
    if (!byPath.has(id)) byPath.set(id, []);
    byPath.get(id)!.push(ref);
    if (ref.comp.metadata?.pathOrder === undefined) {
      ref.comp.metadata = { ...(ref.comp.metadata ?? {}), pathOrder: index };
    }
  });

  const branches = Array.from(byPath.entries()).map(([id, refs]) => {
    refs.sort((a, b) => metadataNumber(a.comp, "pathOrder", refs.indexOf(a)) - metadataNumber(b.comp, "pathOrder", refs.indexOf(b)));
    return { id, bucket: "branches" as const, refs };
  });
  return { main, branches };
}

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle?: string,
  targetHandle?: string,
  data?: CircuitEdgeData,
  highlight = false,
): CircuitEdge {
  const route = data?.route ?? "path";
  const stroke = route === "parallel-add" ? WIRE_MUTED : WIRE_STROKE;
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: "circuitButton",
    className: `xy-model-edge xy-circuit-wire xy-circuit-wire-${route} ${data?.addMode ? "xy-insertable-edge" : ""} ${highlight ? "is-edge-linked-to-selected" : ""}`.trim(),
    data,
    markerEnd: undefined,
    style: {
      strokeWidth: route === "parallel-add" ? 1.8 : highlight ? 2.9 : 2.25,
      stroke,
      strokeDasharray: route === "parallel-add" ? "7 7" : undefined,
    },
  };
}

function componentNode(refItem: ComponentRef, x: number, yCenter: number, selectedId: string | null, language: Language, compact = false): Node<ModelFlowNodeData> {
  return {
    id: `component:${refItem.comp.id}`,
    type: "modelComponent",
    position: { x, y: yCenter - COMPONENT_H / 2 },
    data: { kind: "component", label: refItem.comp.id, refItem, selected: selectedId === refItem.comp.id, language, compact },
    draggable: false,
    selectable: true,
  };
}

function centeredComponentX(startX: number, index: number) {
  return startX + index * (COMPONENT_W + SERIES_GAP_X);
}

function branchY(index: number, count: number) {
  if (count <= 1) return MAIN_Y;
  const centerOffset = (count - 1) / 2;
  return MAIN_Y + (index - centerOffset) * BRANCH_GAP_Y;
}

function mainSeriesPositions(mainCount: number) {
  const firstX = LEFT_MARGIN_X + TERMINAL_TO_FIRST_X;
  const componentXs = Array.from({ length: mainCount }, (_v, index) => centeredComponentX(firstX, index));
  const leftJunctionX = mainCount > 0
    ? firstX + mainCount * (COMPONENT_W + SERIES_GAP_X) + 16
    : LEFT_MARGIN_X + TERMINAL_TO_FIRST_X;
  return { firstX, componentXs, leftJunctionX };
}

export async function buildFlowGraphWithElk(
  model: ModelSpec,
  selectedId: string | null,
  language: Language,
  options: { readOnly?: boolean; disabled?: boolean; registry?: unknown[]; selectedDefinitions?: Record<string, string> } = {},
): Promise<FlowGraph> {
  // The current editor uses a deterministic circuit layout rather than feeding
  // a partially constrained circuit into ELK and then overriding coordinates.
  // ELK remains available for future fully graph-native layout, but this path
  // avoids mixed coordinate systems and preserves clean straight circuit wires.
  return buildFlowGraph(model, selectedId, language, options);
}

export function buildFlowGraph(
  model: ModelSpec,
  selectedId: string | null,
  language: Language,
  options: { readOnly?: boolean; disabled?: boolean; registry?: unknown[]; selectedDefinitions?: Record<string, string> } = {},
): FlowGraph {
  const { main, branches } = refsToPaths(model);
  const hasAnyComponent = main.refs.length > 0 || branches.some((path) => path.refs.length > 0);
  if (!hasAnyComponent) {
    const terminalLeftX = LEFT_MARGIN_X;
    const terminalRightX = terminalLeftX + 720;
    const nodes: Node<ModelFlowNodeData>[] = [
      { id: "terminal:vext", type: "modelTerminal", position: { x: terminalLeftX, y: MAIN_Y - TERMINAL_H / 2 }, data: { kind: "terminal", role: "vext", label: "V", subtitle: "external" }, draggable: false, selectable: false },
      { id: "terminal:ground", type: "modelTerminal", position: { x: terminalRightX, y: MAIN_Y - TERMINAL_H / 2 }, data: { kind: "terminal", role: "ground", label: "GND", subtitle: "V = 0" }, draggable: false, selectable: false },
    ];
    const edges: CircuitEdge[] = [edge(
      "edge:empty-start",
      "terminal:vext",
      "terminal:ground",
      "out",
      "in",
      { addBucket: "main", addMode: "serial", pathId: "path:main", insertIndex: 0, route: "path" },
    )];
    return { nodes, edges };
  }
  const visibleBranches = branches.length ? branches : [{ id: "path:empty-branch", bucket: "branches" as const, refs: [] }];
  const branchCount = visibleBranches.length;
  const maxBranchLen = Math.max(1, ...visibleBranches.map((path) => path.refs.length));
  const { componentXs: mainComponentXs, leftJunctionX } = mainSeriesPositions(main.refs.length);
  const branchStartX = leftJunctionX + JUNCTION_TO_BRANCH_X;
  const rightJunctionX = branchStartX + maxBranchLen * COMPONENT_W + Math.max(1, maxBranchLen) * SERIES_GAP_X + JUNCTION_TO_BRANCH_X;
  const terminalLeftX = LEFT_MARGIN_X;
  const terminalRightX = rightJunctionX + 180;
  const branchYValues = visibleBranches.map((_path, index) => branchY(index, branchCount));
  const junctionYValues = Array.from(new Set([MAIN_Y, ...branchYValues])).sort((a, b) => a - b);
  const topY = Math.min(...junctionYValues);
  const bottomY = Math.max(...junctionYValues);

  const nodes: Node<ModelFlowNodeData>[] = [
    { id: "terminal:vext", type: "modelTerminal", position: { x: terminalLeftX, y: MAIN_Y - TERMINAL_H / 2 }, data: { kind: "terminal", role: "vext", label: "V", subtitle: "external" }, draggable: false, selectable: false },
    { id: "terminal:ground", type: "modelTerminal", position: { x: terminalRightX, y: MAIN_Y - TERMINAL_H / 2 }, data: { kind: "terminal", role: "ground", label: "GND", subtitle: "V = 0" }, draggable: false, selectable: false },
    { id: "junction:left", type: "modelJunction", position: { x: leftJunctionX - JUNCTION_W / 2, y: topY }, data: { kind: "junction", label: "split junction", pathYPositions: junctionYValues, nodeTopY: topY }, draggable: false, selectable: false },
    { id: "junction:right", type: "modelJunction", position: { x: rightJunctionX - JUNCTION_W / 2, y: topY }, data: { kind: "junction", label: "merge junction", pathYPositions: junctionYValues, nodeTopY: topY }, draggable: false, selectable: false },
  ];

  main.refs.forEach((refItem, index) => {
    nodes.push(componentNode(refItem, mainComponentXs[index], MAIN_Y, selectedId, language, main.refs.length >= 4));
  });

  visibleBranches.forEach((path, pathIndex) => {
    const y = branchYValues[pathIndex];
    path.refs.forEach((refItem, index) => {
      nodes.push(componentNode(refItem, centeredComponentX(branchStartX, index), y, selectedId, language, path.refs.length >= 4));
    });
  });

  const edges: CircuitEdge[] = [];
  const mainTargets = ["terminal:vext", ...main.refs.map((ref) => `component:${ref.comp.id}`), "junction:left"];
  for (let i = 0; i < mainTargets.length - 1; i += 1) {
    const source = mainTargets[i];
    const target = mainTargets[i + 1];
    const sourceHandle = source === "terminal:vext" ? "out" : "out";
    const targetHandle = target === "junction:left" ? `in-${MAIN_Y}` : "in";
    edges.push(edge(
      `edge:path:main:${source}-${target}`,
      source,
      target,
      sourceHandle,
      targetHandle,
      { addBucket: "main", addMode: "serial", pathId: "path:main", insertIndex: i, route: "path" },
      selectedId ? source.endsWith(selectedId) || target.endsWith(selectedId) : false,
    ));
  }

  visibleBranches.forEach((path, pathIndex) => {
    const y = branchYValues[pathIndex];
    if (path.refs.length === 0) {
      edges.push(edge(
        `edge:${path.id}:empty`,
        "junction:left",
        "junction:right",
        `out-${y}`,
        `in-${y}`,
        { addBucket: "branches", addMode: "serial", pathId: path.id, insertIndex: 0, route: "path" },
      ));
      return;
    }
    const targets = ["junction:left", ...path.refs.map((ref) => `component:${ref.comp.id}`), "junction:right"];
    for (let i = 0; i < targets.length - 1; i += 1) {
      const source = targets[i];
      const target = targets[i + 1];
      edges.push(edge(
        `edge:${path.id}:${source}-${target}`,
        source,
        target,
        source === "junction:left" ? `out-${y}` : "out",
        target === "junction:right" ? `in-${y}` : "in",
        { addBucket: "branches", addMode: "serial", pathId: path.id, insertIndex: i, route: "path" },
        selectedId ? source.endsWith(selectedId) || target.endsWith(selectedId) : false,
      ));
    }
  });

  edges.push(edge("edge:right-ground", "junction:right", "terminal:ground", `out-${MAIN_Y}`, "in", { route: "terminal", routePoints: [{ x: rightJunctionX + JUNCTION_W / 2, y: MAIN_Y }, { x: terminalRightX, y: MAIN_Y }] }, false));

  if (!options.readOnly) {
    const addY = bottomY + 88;
    nodes.push({
      id: "action:add-parallel-path",
      type: "modelAction",
      position: { x: (leftJunctionX + rightJunctionX) / 2 - 88, y: addY - 18 },
      data: { kind: "action", label: "+ Add parallel path", actionBucket: "branches", actionMode: "parallel" },
      draggable: false,
      selectable: false,
    });
  }

  return { nodes, edges };
}

export type { ModelFlowNodeData, CircuitEdge };
