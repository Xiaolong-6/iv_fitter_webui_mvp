import type { Edge, Node } from "@xyflow/react";
import type { ReactNode } from "react";
import type { ComponentSpec, FunctionDefinition, ModelSpec } from "../../model/types";
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
}

export type ComponentRef = { location: ModelLocation; comp: ComponentSpec };
export type FlowNodeKind = "terminal" | "component";
export type TerminalRole = "vext" | "vi" | "ground";

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
  compact?: boolean;
};

export type CircuitEdgeData = {
  addBucket?: BuilderBucket;
} & Record<string, unknown>;

export type CircuitEdge = Edge<CircuitEdgeData>;

export type FlowGraph = {
  nodes: Node<ModelFlowNodeData>[];
  edges: CircuitEdge[];
};

export type BuilderPreset = { name: string; model: ModelSpec };
