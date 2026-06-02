import type { GraphSpec, ModelSpec, ParameterSpec } from "../../model/types";

export type SchematicNodeKind = "terminal" | "junction";
export type SchematicTerminalRole = "positive" | "ground";
export type ComponentBehavior = "R_of_V" | "I_of_V" | "dV_of_I" | "residual";
export type PortSide = "p" | "n";
export type ValidationSeverity = "info" | "warning" | "error";

export interface XYPosition {
  x: number;
  y: number;
}

export interface SchematicNode {
  id: string;
  kind: SchematicNodeKind;
  label: string;
  role?: SchematicTerminalRole;
  position: XYPosition;
  locked?: boolean;
}

export interface ComponentParameter {
  id: string;
  symbol: string;
  value: number;
  lower?: number | null;
  upper?: number | null;
  fit: boolean;
  unit?: string | null;
  description?: string | null;
}

export interface SchematicComponent {
  id: string;
  label: string;
  behavior: ComponentBehavior;
  presetId: string;
  presetLabel: string;
  expression: string;
  sign: 1 | -1;
  parameters: ComponentParameter[];
  position: XYPosition;
  size?: { width: number; height: number };
  userNotes?: string;
}

export interface PortRef {
  kind: "node" | "component";
  id: string;
  port?: PortSide;
}

export interface SchematicWire {
  id: string;
  from: PortRef;
  to: PortRef;
  waypoints: XYPosition[];
}

export interface SchematicGraph {
  version: 2;
  nodes: SchematicNode[];
  components: SchematicComponent[];
  wires: SchematicWire[];
  terminals: {
    positive: string;
    ground: string;
  };
  metadata: {
    title: string;
    createdBy: "model-builder-v2";
    migratedFromLegacy?: boolean;
    updatedAt?: string;
  };
}

export interface ComponentPreset {
  id: string;
  label: string;
  group: "Basic" | "Advanced" | "Custom";
  behavior: ComponentBehavior;
  expression: string;
  description: string;
  parameters: ComponentParameter[];
  sign?: 1 | -1;
}

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  title: string;
  message: string;
  targetId?: string;
}

export interface ValidationResult {
  valid: boolean;
  activeComponentIds: Set<string>;
  activeWireIds: Set<string>;
  danglingComponentIds: Set<string>;
  danglingWireIds: Set<string>;
  issues: ValidationIssue[];
}

export interface CompiledGraphResult {
  graphSpec: GraphSpec;
  validation: ValidationResult;
}

export function cloneParameter(parameter: ComponentParameter): ComponentParameter {
  return { ...parameter };
}

export function componentParamsToBackend(parameters: ComponentParameter[]): Record<string, ParameterSpec> {
  return Object.fromEntries(parameters.map((parameter) => [
    parameter.symbol,
    {
      value: parameter.value,
      lower: parameter.lower ?? null,
      upper: parameter.upper ?? null,
      fit: parameter.fit,
      unit: parameter.unit ?? null,
      label: parameter.symbol,
      description: parameter.description ?? null,
    },
  ]));
}

export function getSchematicGraph(model: ModelSpec): SchematicGraph | null {
  const candidate = model.graph?.schema_version === "schematic_v2"
    ? (model.graph as unknown as { schematic?: SchematicGraph }).schematic
    : null;
  if (!candidate || candidate.version !== 2) return null;
  return candidate;
}
