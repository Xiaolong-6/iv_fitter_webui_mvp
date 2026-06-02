import type { Mb3PortRef, Mb3State } from "../domain/types";
import { resolveNonCollidingPosition } from "../domain/collision";
import type { Mb3Action } from "./actions";

function handleToPort(id: string, handle: string | null): Mb3PortRef {
  if (handle === "p" || handle === "n") {
    return { kind: "component", id, port: handle };
  }
  return { kind: "node", id };
}

export function mb3Reducer(state: Mb3State, action: Mb3Action): Mb3State {
  switch (action.type) {
    case "hydrate":
      return action.state;
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
        graph: { ...state.graph, wires },
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
      const from = handleToPort(action.sourceId, action.sourceHandle);
      const to = handleToPort(action.targetId, action.targetHandle);
      const id = `w${state.graph.wires.length + 1}_${Date.now()}`;
      const wires = [...state.graph.wires, { id, from, to }];
      return { ...state, graph: { ...state.graph, wires }, dirty: true };
    }
    default:
      return state;
  }
}
