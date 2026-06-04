import type { Mb3Graph, Mb3State } from "../domain/types";
import type { ModelSpec } from "../../model/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function graphFromModelMetadata(model?: ModelSpec): Mb3Graph | null {
  const candidate = model?.graph?.metadata?.modelBuilder ?? model?.graph?.metadata?.modelBuilderV3;
  if (!isRecord(candidate)) return null;
  if (candidate.version !== 3) return null;
  if (!isRecord(candidate.terminals)) return null;
  if (typeof candidate.terminals.positive !== "string") return null;
  if (typeof candidate.terminals.ground !== "string") return null;
  if (!Array.isArray(candidate.nodes)) return null;
  if (!Array.isArray(candidate.components)) return null;
  if (!Array.isArray(candidate.wires)) return null;
  return candidate as unknown as Mb3Graph;
}

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

export function createMb3InitialState(model?: ModelSpec): Mb3State {
  return {
    graph: graphFromModelMetadata(model) ?? createMb3StarterGraph(),
    selectedComponentId: null,
    selectedWireId: null,
    activePresetId: "ohmic_R",
    dirty: false,
  };
}
