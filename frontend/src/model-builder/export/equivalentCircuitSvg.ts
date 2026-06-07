import type { Language } from "../../model/i18n";
import type { ModelSpec } from "../../model/types";
import { renderEquivalentCircuitSvg as renderLegacyEquivalentCircuitSvg } from "../../model/EquivalentCircuitStaticSvg";
import type { Mb3Graph, Mb3PortRef } from "../domain/types";
import { routeMb3Wire, type Mb3Point } from "../canvas/routing";

const COMPONENT_WIDTH = 150;
const COMPONENT_HEIGHT = 54;
const TERMINAL_WIDTH = 72;
const TERMINAL_HEIGHT = 46;
const JUNCTION_SIZE = 13;
const PADDING = 48;

function escapeXml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function graphFromModel(model: ModelSpec): Mb3Graph | null {
  const candidate = model.graph?.metadata?.modelBuilder ?? model.graph?.metadata?.modelBuilderV3;
  if (!isRecord(candidate)) return null;
  if (candidate.version !== 3) return null;
  if (!Array.isArray(candidate.nodes) || !Array.isArray(candidate.components) || !Array.isArray(candidate.wires)) {
    return null;
  }
  if (!isRecord(candidate.terminals)) return null;
  if (typeof candidate.terminals.positive !== "string" || typeof candidate.terminals.ground !== "string") {
    return null;
  }
  return candidate as unknown as Mb3Graph;
}

function activeComponentIds(model: ModelSpec): Set<string> {
  return new Set((model.graph?.components ?? []).map((component) => component.id));
}

function boxForNode(graph: Mb3Graph, nodeId: string) {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  return {
    x: node.position.x,
    y: node.position.y,
    width: node.kind === "terminal" ? TERMINAL_WIDTH : JUNCTION_SIZE,
    height: node.kind === "terminal" ? TERMINAL_HEIGHT : JUNCTION_SIZE,
  };
}

function boxForComponent(graph: Mb3Graph, componentId: string) {
  const component = graph.components.find((candidate) => candidate.id === componentId);
  if (!component) return null;
  return { x: component.position.x, y: component.position.y, width: COMPONENT_WIDTH, height: COMPONENT_HEIGHT };
}

function boxForPort(graph: Mb3Graph, port: Mb3PortRef) {
  return port.kind === "component" ? boxForComponent(graph, port.id) : boxForNode(graph, port.id);
}

function graphBounds(graph: Mb3Graph, routes: Mb3Point[][]) {
  const boxes = [
    ...graph.nodes.map((node) => ({
      x: node.position.x,
      y: node.position.y,
      width: node.kind === "terminal" ? TERMINAL_WIDTH : JUNCTION_SIZE,
      height: node.kind === "terminal" ? TERMINAL_HEIGHT : JUNCTION_SIZE,
    })),
    ...graph.components.map((component) => ({
      x: component.position.x,
      y: component.position.y,
      width: COMPONENT_WIDTH,
      height: COMPONENT_HEIGHT,
    })),
  ];
  const routePoints = routes.flat();
  const xs = [...boxes.flatMap((box) => [box.x, box.x + box.width]), ...routePoints.map((point) => point.x)];
  const ys = [...boxes.flatMap((box) => [box.y, box.y + box.height]), ...routePoints.map((point) => point.y)];
  return {
    minX: Math.min(...xs, 0) - PADDING,
    minY: Math.min(...ys, 0) - PADDING,
    maxX: Math.max(...xs, 760) + PADDING,
    maxY: Math.max(...ys, 220) + PADDING,
  };
}

function pathFromPoints(points: Mb3Point[], offsetX: number, offsetY: number): string {
  if (!points.length) return "";
  const [first, ...rest] = points;
  return `M ${first.x + offsetX} ${first.y + offsetY} ${rest.map((point) => `L ${point.x + offsetX} ${point.y + offsetY}`).join(" ")}`;
}

function routeForWire(graph: Mb3Graph, wire: Mb3Graph["wires"][number], existingRoutes: Mb3Point[][]): Mb3Point[] {
  const storedRoute = wire.routePoints
    ?.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .map((point) => ({ x: point.x, y: point.y }));
  if (storedRoute && storedRoute.length >= 2) {
    return storedRoute;
  }
  return routeMb3Wire(graph, wire.from, wire.to, existingRoutes);
}

function renderGraphSvg(model: ModelSpec, graph: Mb3Graph): string {
  const activeIds = activeComponentIds(model);
  const existingRoutes: Mb3Point[][] = [];
  const routed = graph.wires.map((wire) => {
    const route = routeForWire(graph, wire, existingRoutes);
    if (route.length) existingRoutes.push(route);
    const inactive =
      (wire.from.kind === "component" && !activeIds.has(wire.from.id)) ||
      (wire.to.kind === "component" && !activeIds.has(wire.to.id));
    return { wire, route, inactive };
  });
  const bounds = graphBounds(graph, routed.map((item) => item.route));
  const offsetX = -bounds.minX;
  const offsetY = -bounds.minY;
  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Model Builder equivalent circuit" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; border-radius: 10px;">`;
  svg += `<defs><marker id="mbv3-report-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L8,4 L0,8 z" fill="#334155"/></marker></defs>`;

  for (const { wire, route, inactive } of routed) {
    if (route.length < 2) continue;
    const touchesKnown = Boolean(boxForPort(graph, wire.from) && boxForPort(graph, wire.to));
    const stroke = inactive ? "#94a3b8" : "#334155";
    const dash = inactive ? ` stroke-dasharray="7 6"` : "";
    const marker = !inactive && touchesKnown ? ` marker-end="url(#mbv3-report-arrow)"` : "";
    svg += `<path d="${pathFromPoints(route, offsetX, offsetY)}" fill="none" stroke="${stroke}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"${dash}${marker}/>`;
  }

  for (const node of graph.nodes) {
    const box = boxForNode(graph, node.id);
    if (!box) continue;
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    if (node.kind === "junction") {
      svg += `<circle cx="${x + JUNCTION_SIZE / 2}" cy="${y + JUNCTION_SIZE / 2}" r="5.8" fill="#111827"/>`;
      continue;
    }
    const helper = node.role === "positive" ? "Vext" : node.role === "ground" ? "0" : "";
    svg += `<text x="${x + TERMINAL_WIDTH / 2}" y="${y + 8}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">${escapeXml(node.label)}</text>`;
    if (helper) {
      svg += `<text x="${x + TERMINAL_WIDTH + 6}" y="${y + 23}" font-size="11" font-weight="800" fill="#64748b">${escapeXml(helper)}</text>`;
    }
  }

  for (const component of graph.components) {
    const box = boxForComponent(graph, component.id);
    if (!box) continue;
    const x = box.x + offsetX;
    const y = box.y + offsetY;
    const inactive = !activeIds.has(component.id);
    svg += `<rect x="${x}" y="${y}" width="${box.width}" height="${box.height}" rx="14" fill="${inactive ? "#f8fafc" : "#ffffff"}" stroke="${inactive ? "#cbd5e1" : "#93c5fd"}" stroke-width="1.6"${inactive ? ` stroke-dasharray="7 5"` : ""}/>`;
    svg += `<text x="${x + box.width / 2}" y="${y + box.height / 2 + 8}" text-anchor="middle" font-size="22" font-weight="900" fill="#0f172a">${escapeXml(component.label || component.id)}</text>`;
    if (component.sign === -1) {
      svg += `<rect x="${x + box.width / 2 - 18}" y="${y - 10}" width="36" height="14" rx="7" fill="#fffbeb" stroke="#fbbf24"/>`;
      svg += `<text x="${x + box.width / 2}" y="${y + 1}" text-anchor="middle" font-size="9" font-weight="900" fill="#92400e">REV</text>`;
    }
  }

  svg += `</svg>`;
  return svg;
}

export function renderModelBuilderEquivalentCircuitSvg(model: ModelSpec, language: Language): string {
  const graph = graphFromModel(model);
  if (!graph) return renderLegacyEquivalentCircuitSvg(model, language);
  return renderGraphSvg(model, graph);
}
