import { createContext, useContext, type ReactNode } from "react";
import type { FunctionDefinition, ModelSpec } from "../../model/types";
import type { Language } from "../../model/i18n";
import type { BuilderBucket } from "../../model-builder/rules";

export type ModelFlowContextValue = {
  model: ModelSpec;
  registry: FunctionDefinition[];
  language: Language;
  disabled?: boolean;
  readOnly?: boolean;
  selectedDefinitions: Record<string, string>;
  removeById: (componentId: string) => void;
  addFrom: (bucket: BuilderBucket, functionType?: string) => void;
  setAddDefinition: (bucket: BuilderBucket, functionType: string) => void;
  renameById: (componentId: string, nextName: string) => void;
  replaceDefinitionById: (componentId: string, functionType: string) => void;
  updateExpressionById: (componentId: string, expression: string) => void;
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
