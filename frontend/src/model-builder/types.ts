import type { ReactNode } from "react";
import type { FunctionDefinition, ModelSpec } from "../model/types";
import type { Language } from "../model/i18n";

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
