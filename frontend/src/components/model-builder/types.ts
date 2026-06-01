import type { Edge, Node } from "@xyflow/react";
import type { ReactNode } from "react";
import type { ComponentSpec, FunctionDefinition, ModelSpec, ParameterSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket, ModelLocation } from "../../model-builder/rules";

export interface ModelBuilderProps {
  model: ModelSpec;
  registry: FunctionDefinition[];
  onChange: (model: ModelSpec) => void;
  language: Language;
  disabled?: boolean;
  onGoToFitting?: () => void;
  readOnly?: boolean;
  previewContent?: ReactNode;
  canvasActions?: ReactNode;
}

export type ComponentRef = { location: ModelLocation; comp: ComponentSpec };
export type FlowNodeKind = "terminal" | "component" | "action" | "junction" | "annotation";
export type TerminalRole = "vext" | "vi" | "ground";
export type ComponentBehaviorMode = "R_of_V" | "I_of_V" | "dV_of_I" | "custom_residual";

export type ModelFlowNodeData = {
  kind: FlowNodeKind;
  label: string;
  subtitle?: string;
  role?: TerminalRole;
  refItem?: ComponentRef;
  selected?: boolean;
  language?: Language;
  branchPortCount?: number;
  branchYPositions?: number[];
  pathYPositions?: number[];
  nodeTopY?: number;
  compact?: boolean;
  actionBucket?: BuilderBucket;
  actionPathId?: string;
  actionInsertIndex?: number;
  actionMode?: "serial" | "parallel";
  latex?: string;
  annotationTone?: "global" | "component";
  annotationTitle?: string;
};

export type CircuitEdgeData = {
  addBucket?: BuilderBucket;
  addMode?: "serial" | "parallel";
  pathId?: string;
  insertIndex?: number;
  label?: string;
  route?: "terminal" | "path" | "parallel" | "parallel-add";
  routePoints?: { x: number; y: number }[];
} & Record<string, unknown>;

export type CircuitEdge = Edge<CircuitEdgeData>;

export type FlowGraph = {
  nodes: Node<ModelFlowNodeData>[];
  edges: CircuitEdge[];
};

export type BuilderPreset = { name: string; model: ModelSpec };
export type CustomParameterPatch = Partial<ParameterSpec> & { nextName?: string };
