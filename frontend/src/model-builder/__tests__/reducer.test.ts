import { describe, expect, it } from "vitest";
import { createMb3InitialState } from "../state/factory";
import { mb3Reducer } from "../state/reducer";
import type { Mb3State } from "../domain/types";
import { MB3_BUILT_IN_PRESETS } from "../domain/presets";

describe("model-builder reducer", () => {
  it("selects component and clears wire selection", () => {
    const initial = { ...createMb3InitialState(), selectedWireId: "w1" };
    const next = mb3Reducer(initial, { type: "selectComponent", componentId: "Rs" });
    expect(next.selectedComponentId).toBe("Rs");
    expect(next.selectedWireId).toBeNull();
  });

  it("moves component and marks state dirty", () => {
    const initial = {
      ...createMb3InitialState(),
      graph: MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph,
    };
    const next = mb3Reducer(initial, { type: "moveEntity", entityId: "Rs", x: 900, y: 120 });
    const rs = next.graph.components.find((component) => component.id === "Rs");
    expect(rs?.position).toEqual({ x: 900, y: 120 });
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
    const initial = {
      ...createMb3InitialState(),
      graph: MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph,
    };
    const d1 = initial.graph.components.find((component) => component.id === "D1");
    const next = mb3Reducer(initial, {
      type: "moveEntity",
      entityId: "Rsh",
      x: d1?.position.x ?? 0,
      y: d1?.position.y ?? 0,
    });
    const rsh = next.graph.components.find((component) => component.id === "Rsh");
    expect(rsh?.position).not.toEqual(d1?.position);
    expect(next.dirty).toBe(true);
  });

  it("deletes only the selected wire and keeps the other component connection", () => {
    const initial: Mb3State = {
      ...createMb3InitialState(),
      graph: {
        version: 3,
        terminals: { positive: "V", ground: "GND" },
        nodes: [
          { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
          { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 240 } },
        ],
        components: [
          {
            id: "R0",
            label: "R0",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "R0",
            sign: 1,
            position: { x: 80, y: 100 },
            parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
        ],
        wires: [
          { id: "w-top", from: { kind: "node", id: "V" }, to: { kind: "component", id: "R0", port: "p" } },
          { id: "w-bottom", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "node", id: "GND" } },
        ],
      },
      selectedWireId: "w-top",
    };

    const next = mb3Reducer(initial, { type: "deleteWire", wireId: "w-top" });

    expect(next.graph.wires.map((wire) => wire.id)).toEqual(["w-bottom"]);
    expect(next.graph.components.map((component) => component.id)).toEqual(["R0"]);
    expect(next.selectedWireId).toBeNull();
    expect(next.dirty).toBe(true);
  });

  it("keeps terminal nodes as shared branch points instead of creating Vext/0 junctions", () => {
    const initial: Mb3State = {
      ...createMb3InitialState(),
      graph: {
        version: 3,
        terminals: { positive: "V", ground: "GND" },
        nodes: [
          { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
          { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 240 } },
        ],
        components: [
          {
            id: "R0",
            label: "R0",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "R0",
            sign: 1,
            position: { x: 80, y: 100 },
            parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
          {
            id: "R1",
            label: "R1",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "R1",
            sign: 1,
            position: { x: 260, y: 100 },
            parameters: [{ symbol: "R1", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
        ],
        wires: [
          { id: "w-top", from: { kind: "node", id: "V" }, to: { kind: "component", id: "R0", port: "p" } },
          { id: "w-bottom", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "node", id: "GND" } },
        ],
      },
    };
    const next = mb3Reducer(initial, {
      type: "connectPorts",
      sourceId: "V",
      sourceHandle: "node",
      targetId: "R1",
      targetHandle: "p",
      position: { x: 999, y: 999 },
    });

    const junctions = next.graph.nodes.filter((node) => node.kind === "junction");
    expect(junctions).toEqual([]);
    expect(next.graph.wires.some((wire) =>
      wire.from.kind === "node" && wire.from.id === "V"
      && wire.to.kind === "component" && wire.to.id === "R1" && wire.to.port === "p",
    )).toBe(true);
  });

  it("preserves saved junction wires during hydrate instead of silently rewriting user wiring", () => {
    const initial = createMb3InitialState();
    const graph = structuredClone(initial.graph);
    graph.nodes.push({ id: "Jlegacy", kind: "junction", label: "", position: { x: 320, y: 120 } });
    graph.wires = [
      { id: "w-v-j", from: { kind: "node", id: "V" }, to: { kind: "node", id: "Jlegacy" } },
      { id: "w-j-r", from: { kind: "node", id: "Jlegacy" }, to: { kind: "component", id: "Rs", port: "p" } },
      { id: "w-r-g", from: { kind: "component", id: "Rs", port: "n" }, to: { kind: "node", id: "GND" } },
    ];

    const next = mb3Reducer(initial, {
      type: "hydrate",
      state: { ...initial, graph },
    });

    expect(next.graph.nodes.some((node) => node.id === "Jlegacy")).toBe(true);
    expect(next.graph.wires.map((wire) => wire.id)).toEqual(["w-v-j", "w-j-r", "w-r-g"]);
  });

  it("refuses to reconnect a component port that already has a user wire", () => {
    const initial: Mb3State = {
      ...createMb3InitialState(),
      graph: {
        version: 3,
        terminals: { positive: "V", ground: "GND" },
        nodes: [
          { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
          { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 260 } },
        ],
        components: [
          {
            id: "Rs",
            label: "Rs",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "Rs",
            sign: 1,
            position: { x: 80, y: 80 },
            parameters: [{ symbol: "Rs", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
          {
            id: "D1",
            label: "D1",
            templateKey: "shockley_diode",
            behavior: "I_of_V",
            expression: "I0*(exp(V/(n*8.617333262e-5*T))-1)",
            sign: 1,
            position: { x: 280, y: 140 },
            parameters: [
              { symbol: "I0", value: 1e-12, lower: 1e-30, upper: 1, fit: true, unit: "A" },
              { symbol: "n", value: 1.5, lower: 0.5, upper: 10, fit: true, unit: "1" },
              { symbol: "T", value: 298.15, lower: 250, upper: 350, fit: false, unit: "K" },
            ],
          },
          {
            id: "R0",
            label: "R0",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "R0",
            sign: 1,
            position: { x: 80, y: 180 },
            parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
        ],
        wires: [
          { id: "w-v-rs", from: { kind: "node", id: "V" }, to: { kind: "component", id: "Rs", port: "p" } },
          { id: "w-rs-r0", from: { kind: "component", id: "Rs", port: "n" }, to: { kind: "component", id: "R0", port: "p" } },
          { id: "w-r0-g", from: { kind: "component", id: "R0", port: "n" }, to: { kind: "node", id: "GND" } },
        ],
      },
    };
    const next = mb3Reducer(initial, {
      type: "connectPorts",
      sourceId: "Rs",
      sourceHandle: "n",
      targetId: "D1",
      targetHandle: "p",
      position: { x: 999, y: 999 },
    });

    expect(next.graph.nodes.filter((node) => node.kind === "junction")).toEqual([]);
    expect(next.graph.wires.map((wire) => wire.id)).toEqual(["w-v-rs", "w-rs-r0", "w-r0-g"]);
  });
  it("normalizes React Flow source/target handle ids back to physical p/n ports", () => {
    const initial: Mb3State = {
      ...createMb3InitialState(),
      graph: {
        version: 3,
        terminals: { positive: "V", ground: "GND" },
        nodes: [
          { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 0, y: 0 } },
          { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 0, y: 240 } },
        ],
        components: [
          {
            id: "R0",
            label: "R0",
            templateKey: "resistance",
            behavior: "R_of_V",
            expression: "R0",
            sign: 1,
            position: { x: 80, y: 100 },
            parameters: [{ symbol: "R0", value: 10, lower: 0, upper: 1e9, fit: true, unit: "ohm" }],
          },
        ],
        wires: [],
      },
    };

    const next = mb3Reducer(initial, {
      type: "connectPorts",
      sourceId: "V",
      sourceHandle: "node",
      targetId: "R0",
      targetHandle: "p-target",
    });

    expect(next.graph.wires[0]).toMatchObject({
      from: { kind: "node", id: "V" },
      to: { kind: "component", id: "R0", port: "p" },
    });
  });

  it("updates component sign for inspector polarity toggles", () => {
    const initial = {
      ...createMb3InitialState(),
      graph: MB3_BUILT_IN_PRESETS.find((preset) => preset.id === "builtin_single_diode_model")!.graph,
    };
    const next = mb3Reducer(initial, { type: "updateComponentSign", componentId: "D1", sign: -1 });
    expect(next.graph.components.find((component) => component.id === "D1")?.sign).toBe(-1);
    expect(next.dirty).toBe(true);
  });

});
