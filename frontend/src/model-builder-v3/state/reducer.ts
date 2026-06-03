import type { Mb3Graph, Mb3Node, Mb3PortRef, Mb3State, Mb3Wire } from "../domain/types";
import { resolveNonCollidingPosition } from "../domain/collision";
import type { Mb3Action } from "./actions";

function handleToPort(id: string, handle: string | null): Mb3PortRef {
  if (handle === "p" || handle === "n") {
    return { kind: "component", id, port: handle };
  }
  return { kind: "node", id };
}

function samePort(a: Mb3PortRef, b: Mb3PortRef): boolean {
  return a.kind === b.kind && a.id === b.id && (a.port ?? "node") === (b.port ?? "node");
}

function wireTouchesPort(wire: Mb3Wire, port: Mb3PortRef): boolean {
  return samePort(wire.from, port) || samePort(wire.to, port);
}

function otherWireEnd(wire: Mb3Wire, port: Mb3PortRef): Mb3PortRef {
  return samePort(wire.from, port) ? wire.to : wire.from;
}

function portKey(port: Mb3PortRef): string {
  return port.kind === "component"
    ? `component:${port.id}:${port.port ?? "p"}`
    : `node:${port.id}`;
}

function normalizedWireKey(wire: Mb3Wire): string {
  const keys = [portKey(wire.from), portKey(wire.to)].sort();
  return `${keys[0]}--${keys[1]}`;
}

function normalizeTerminalJunctions(graph: Mb3Graph): Mb3Graph {
  const terminalIds = [graph.terminals.positive, graph.terminals.ground];
  let nodes = graph.nodes;
  let wires = graph.wires;

  for (const terminalId of terminalIds) {
    const terminalPort: Mb3PortRef = { kind: "node", id: terminalId };
    const junctionIds = new Set<string>();
    for (const wire of wires) {
      if (!wireTouchesPort(wire, terminalPort)) continue;
      const other = otherWireEnd(wire, terminalPort);
      if (other.kind !== "node") continue;
      const otherNode = nodes.find((node) => node.id === other.id);
      if (otherNode?.kind === "junction") {
        junctionIds.add(other.id);
      }
    }

    for (const junctionId of junctionIds) {
      const junctionPort: Mb3PortRef = { kind: "node", id: junctionId };
      wires = wires.flatMap((wire) => {
        const touchesTerminal = wireTouchesPort(wire, terminalPort);
        const touchesJunction = wireTouchesPort(wire, junctionPort);
        if (touchesTerminal && touchesJunction) return [];
        if (!touchesJunction) return [wire];
        const other = otherWireEnd(wire, junctionPort);
        if (samePort(other, terminalPort)) return [];
        return [{ ...wire, from: terminalPort, to: other }];
      });
      nodes = nodes.filter((node) => node.id !== junctionId);
    }
  }

  const seen = new Set<string>();
  wires = wires.filter((wire) => {
    if (samePort(wire.from, wire.to)) return false;
    const key = normalizedWireKey(wire);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { ...graph, nodes, wires };
}

function nodePositionForPort(state: Mb3State, port: Mb3PortRef, fallback?: { x: number; y: number }) {
  if (port.kind === "node") {
    return state.graph.nodes.find((node) => node.id === port.id)?.position ?? fallback ?? { x: 520, y: 320 };
  }
  const component = state.graph.components.find((candidate) => candidate.id === port.id);
  if (!component) return fallback ?? { x: 520, y: 320 };
  return {
    x: component.position.x + 95,
    y: component.position.y + (port.port === "n" ? 54 : 0),
  };
}

function ensureJunctionForPort(
  state: Mb3State,
  wires: Mb3Wire[],
  nodes: Mb3Node[],
  port: Mb3PortRef,
  position?: { x: number; y: number },
): { port: Mb3PortRef; wires: Mb3Wire[]; nodes: Mb3Node[] } {
  if (port.kind === "node") {
    const node = state.graph.nodes.find((candidate) => candidate.id === port.id);
    if (node?.kind === "terminal") return { port, wires, nodes };
    if (node?.kind === "junction") return { port, wires, nodes };
  }
  const touching = wires.filter((wire) => wireTouchesPort(wire, port));
  if (touching.length === 0) return { port, wires, nodes };
  if (touching.length === 1) {
    const other = otherWireEnd(touching[0], port);
    const otherNode = other.kind === "node"
      ? nodes.find((node) => node.id === other.id)
      : null;
    if (otherNode?.kind === "junction") {
      return { port: other, wires, nodes };
    }
  }

  const junctionId = `J${state.graph.nodes.filter((node) => node.kind === "junction").length + 1}_${Date.now()}`;
  const junctionPort: Mb3PortRef = { kind: "node", id: junctionId };
  const junction: Mb3Node = {
    id: junctionId,
    kind: "junction",
    label: "",
    position: port.kind === "component"
      ? nodePositionForPort(state, port, position)
      : position ?? nodePositionForPort(state, port),
  };
  const rewritten = wires.map((wire) => {
    if (!wireTouchesPort(wire, port)) return wire;
    return {
      ...wire,
      from: otherWireEnd(wire, port),
      to: junctionPort,
    };
  });
  rewritten.push({
    id: `w${rewritten.length + 1}_${Date.now()}_junction`,
    from: junctionPort,
    to: port,
  });
  return { port: junctionPort, wires: rewritten, nodes: [...nodes, junction] };
}

export function mb3Reducer(state: Mb3State, action: Mb3Action): Mb3State {
  switch (action.type) {
    case "hydrate":
      return { ...action.state, graph: normalizeTerminalJunctions(action.state.graph) };
    case "setDirty":
      return { ...state, dirty: action.dirty };
    case "setActivePreset":
      return { ...state, activePresetId: action.presetId };
    case "selectComponent":
      return { ...state, selectedComponentId: action.componentId, selectedWireId: null };
    case "renameComponent": {
      const components = state.graph.components.map((component) =>
        component.id === action.componentId
          ? { ...component, label: action.label || component.id }
          : component,
      );
      return { ...state, graph: { ...state.graph, components }, dirty: true };
    }
    case "updateComponentBehavior": {
      const components = state.graph.components.map((component) =>
        component.id === action.componentId
          ? { ...component, behavior: action.behavior }
          : component,
      );
      return { ...state, graph: { ...state.graph, components }, dirty: true };
    }
    case "addComponentParameter": {
      const symbol = action.parameter.symbol.trim();
      if (!symbol) return state;
      const components = state.graph.components.map((component) => {
        if (component.id !== action.componentId) return component;
        if (component.parameters.some((parameter) => parameter.symbol === symbol)) {
          return component;
        }
        return {
          ...component,
          parameters: [...component.parameters, { ...action.parameter, symbol }],
        };
      });
      return { ...state, graph: { ...state.graph, components }, dirty: true };
    }
    case "updateComponentParameter": {
      const components = state.graph.components.map((component) =>
        component.id === action.componentId
          ? {
              ...component,
              parameters: component.parameters.map((parameter) =>
                parameter.symbol === action.symbol
                  ? { ...parameter, ...action.changes }
                  : parameter,
              ),
            }
          : component,
      );
      return { ...state, graph: { ...state.graph, components }, dirty: true };
    }
    case "deleteComponent": {
      const components = state.graph.components.filter(
        (component) => component.id !== action.componentId,
      );
      const wires = state.graph.wires.filter(
        (wire) =>
          !(
            (wire.from.kind === "component" && wire.from.id === action.componentId) ||
            (wire.to.kind === "component" && wire.to.id === action.componentId)
          ),
      );
      return {
        ...state,
        graph: { ...state.graph, components, wires },
        selectedComponentId:
          state.selectedComponentId === action.componentId ? null : state.selectedComponentId,
        dirty: true,
      };
    }
    case "clearCanvas": {
      const terminalIds = new Set([
        state.graph.terminals.positive,
        state.graph.terminals.ground,
      ]);
      const nodes = state.graph.nodes.filter((node) => terminalIds.has(node.id));
      return {
        ...state,
        graph: { ...state.graph, nodes, components: [], wires: [] },
        selectedComponentId: null,
        selectedWireId: null,
        dirty: true,
      };
    }
    case "selectWire":
      return { ...state, selectedWireId: action.wireId, selectedComponentId: null };
    case "addComponent": {
      const position = resolveNonCollidingPosition(
        {
          ...state.graph,
          components: [...state.graph.components, action.component],
        },
        action.component.id,
        action.component.position,
      );
      const component = { ...action.component, position };
      return {
        ...state,
        graph: { ...state.graph, components: [...state.graph.components, component] },
        selectedComponentId: component.id,
        selectedWireId: null,
        dirty: true,
      };
    }
    case "deleteWire": {
      const wires = state.graph.wires.filter((wire) => wire.id !== action.wireId);
      return {
        ...state,
        graph: normalizeTerminalJunctions({ ...state.graph, wires }),
        selectedWireId: state.selectedWireId === action.wireId ? null : state.selectedWireId,
        dirty: true,
      };
    }
    case "moveEntity": {
      const position = resolveNonCollidingPosition(
        state.graph,
        action.entityId,
        { x: action.x, y: action.y },
      );
      const nodes = state.graph.nodes.map((node) =>
        node.id === action.entityId
          ? { ...node, position }
          : node,
      );
      const components = state.graph.components.map((component) =>
        component.id === action.entityId
          ? { ...component, position }
          : component,
      );
      return { ...state, graph: { ...state.graph, nodes, components }, dirty: true };
    }
    case "upsertComponentExpression": {
      const components = state.graph.components.map((component) =>
        component.id === action.componentId
          ? { ...component, expression: action.expression }
          : component,
      );
      return { ...state, graph: { ...state.graph, components }, dirty: true };
    }
    case "connectPorts": {
      if (action.sourceId === action.targetId && action.sourceHandle === action.targetHandle) {
        return state;
      }
      let nodes = state.graph.nodes;
      let wires = state.graph.wires;
      const rawFrom = handleToPort(action.sourceId, action.sourceHandle);
      const rawTo = handleToPort(action.targetId, action.targetHandle);
      const fromJunction = ensureJunctionForPort(state, wires, nodes, rawFrom, action.position);
      nodes = fromJunction.nodes;
      wires = fromJunction.wires;
      const toJunction = ensureJunctionForPort(state, wires, nodes, rawTo, action.position);
      nodes = toJunction.nodes;
      wires = toJunction.wires;
      if (samePort(fromJunction.port, toJunction.port)) return state;
      const id = `w${wires.length + 1}_${Date.now()}`;
      wires = [...wires, { id, from: fromJunction.port, to: toJunction.port }];
      return { ...state, graph: normalizeTerminalJunctions({ ...state.graph, nodes, wires }), dirty: true };
    }
    default:
      return state;
  }
}
