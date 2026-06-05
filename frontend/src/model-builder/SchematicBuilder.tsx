import { useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { ModelSpec } from "../model/types";
import { compileMb3Graph } from "./domain/compile";
import { createMb3InitialState } from "./state/factory";
import { PreviewCanvas } from "./preview/PreviewCanvas";

type SchematicBuilderProps = {
  model: ModelSpec;
  onChange: (model: ModelSpec) => void;
  canvasActions?: ReactNode;
  onGoToFitting?: () => void;
};

/**
 * Stable Model Builder shell.
 *
 * The current canvas UI is intentionally isolated in PreviewCanvas while we
 * replace the old React Flow editor. Keep fitting/model publication here so
 * the surrounding workflow remains stable during the canvas rewrite.
 */
export function SchematicBuilder({ model, onChange }: SchematicBuilderProps) {
  const initialState = useMemo(() => createMb3InitialState(model), [model]);
  const compiledModel = useMemo(
    () => compileMb3Graph(initialState.graph, model).model,
    [initialState.graph, model],
  );

  useEffect(() => {
    onChange(compiledModel);
  }, [compiledModel, onChange]);

  return (
    <section className="mbv3-shell" aria-label="Model Builder">
      <PreviewCanvas />
    </section>
  );
}
