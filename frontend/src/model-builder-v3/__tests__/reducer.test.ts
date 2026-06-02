import { describe, expect, it } from "vitest";
import { createMb3InitialState } from "../state/factory";
import { mb3Reducer } from "../state/reducer";

describe("model-builder-v3 reducer", () => {
  it("selects component and clears wire selection", () => {
    const initial = { ...createMb3InitialState(), selectedWireId: "w1" };
    const next = mb3Reducer(initial, { type: "selectComponent", componentId: "Rs" });
    expect(next.selectedComponentId).toBe("Rs");
    expect(next.selectedWireId).toBeNull();
  });

  it("moves component and marks state dirty", () => {
    const initial = createMb3InitialState();
    const next = mb3Reducer(initial, { type: "moveEntity", entityId: "Rs", x: 120, y: 420 });
    const rs = next.graph.components.find((component) => component.id === "Rs");
    expect(rs?.position).toEqual({ x: 120, y: 420 });
    expect(next.dirty).toBe(true);
  });

  it("moves terminal node and persists location", () => {
    const initial = createMb3InitialState();
    const next = mb3Reducer(initial, { type: "moveEntity", entityId: "V", x: 720, y: 80 });
    const v = next.graph.nodes.find((node) => node.id === "V");
    expect(v?.position).toEqual({ x: 720, y: 80 });
    expect(next.dirty).toBe(true);
  });

  it("moves colliding component to a nearby open position", () => {
    const initial = createMb3InitialState();
    const d1 = initial.graph.components.find((component) => component.id === "D1");
    const next = mb3Reducer(initial, {
      type: "moveEntity",
      entityId: "I1",
      x: d1?.position.x ?? 0,
      y: d1?.position.y ?? 0,
    });
    const i1 = next.graph.components.find((component) => component.id === "I1");
    expect(i1?.position).not.toEqual(d1?.position);
    expect(next.dirty).toBe(true);
  });
});
