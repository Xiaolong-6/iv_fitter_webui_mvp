import type { Mb3Graph, Mb3State } from "../domain/types";

export function createMb3StarterGraph(): Mb3Graph {
  return {
    version: 3,
    terminals: { positive: "V", ground: "GND" },
    nodes: [
      { id: "V", kind: "terminal", label: "V", role: "positive", position: { x: 520, y: 120 }, locked: false },
      { id: "GND", kind: "terminal", label: "GND", role: "ground", position: { x: 520, y: 560 }, locked: false },
    ],
    components: [],
    wires: [],
  };
}

export function createMb3InitialState(): Mb3State {
  return {
    graph: createMb3StarterGraph(),
    selectedComponentId: null,
    selectedWireId: null,
    activePresetId: "ohmic_R",
    dirty: false,
  };
}
