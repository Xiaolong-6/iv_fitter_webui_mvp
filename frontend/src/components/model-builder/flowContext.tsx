import { createContext, useContext, type ReactNode } from "react";
import type { FunctionDefinition, ModelSpec, ParameterSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket } from "../../model-builder/rules";
import type { ComponentBehaviorMode, CustomParameterPatch } from "./types";

export type AddPlacement = {
  bucket: BuilderBucket;
  functionType?: string;
  mode?: "serial" | "parallel";
  pathId?: string;
  insertIndex?: number;
};

export type ModelFlowContextValue = {
  model: ModelSpec;
  registry: FunctionDefinition[];
  language: Language;
  disabled?: boolean;
  readOnly?: boolean;
  selectedDefinitions: Record<string, string>;
  removeById: (componentId: string) => void;
  addFrom: (bucket: BuilderBucket, functionType?: string) => void;
  addAt: (placement: AddPlacement) => void;
  addLocalParallelById: (componentId: string) => void;
  setAddDefinition: (bucket: BuilderBucket, functionType: string) => void;
  renameById: (componentId: string, nextName: string) => void;
  replaceDefinitionById: (componentId: string, functionType: string) => void;
  updateExpressionById: (componentId: string, expression: string) => void;
  updateBehaviorById: (componentId: string, behavior: ComponentBehaviorMode) => void;
  updatePolarityById: (componentId: string, polarity: string) => void;
  addCustomParameterById: (componentId: string) => void;
  updateCustomParameterById: (componentId: string, paramName: string, patch: CustomParameterPatch) => void;
  removeCustomParameterById: (componentId: string, paramName: string) => void;
};

const ModelFlowContext = createContext<ModelFlowContextValue | null>(null);

export function ModelFlowContextProvider({ value, children }: { value: ModelFlowContextValue; children: ReactNode }) {
  return <ModelFlowContext.Provider value={value}>{children}</ModelFlowContext.Provider>;
}

export function useModelFlowContext() {
  const value = useContext(ModelFlowContext);
  if (!value) throw new Error("Model flow context is not available");
  return value;
}

export function parameterFromPatch(patch: CustomParameterPatch): Partial<ParameterSpec> {
  const { nextName: _nextName, ...rest } = patch;
  return rest;
}
