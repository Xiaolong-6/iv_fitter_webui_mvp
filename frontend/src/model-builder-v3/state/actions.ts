import type { Mb3Behavior, Mb3Component, Mb3Parameter, Mb3State } from "../domain/types";

export type Mb3Action =
  | { type: "selectComponent"; componentId: string | null }
  | { type: "deleteComponent"; componentId: string }
  | { type: "renameComponent"; componentId: string; label: string }
  | { type: "updateComponentBehavior"; componentId: string; behavior: Mb3Behavior }
  | { type: "addComponentParameter"; componentId: string; parameter: Mb3Parameter }
  | {
      type: "updateComponentParameter";
      componentId: string;
      symbol: string;
      changes: Partial<Omit<Mb3Parameter, "symbol">>;
    }
  | { type: "clearCanvas" }
  | { type: "selectWire"; wireId: string | null }
  | { type: "deleteWire"; wireId: string }
  | { type: "setActivePreset"; presetId: string }
  | { type: "addComponent"; component: Mb3Component }
  | { type: "moveEntity"; entityId: string; x: number; y: number }
  | { type: "upsertComponentExpression"; componentId: string; expression: string }
  | { type: "connectPorts"; sourceId: string; sourceHandle: string | null; targetId: string; targetHandle: string | null }
  | { type: "setDirty"; dirty: boolean }
  | { type: "hydrate"; state: Mb3State };
