import type { ReactNode } from "react";
import type { Mb3ConnectivityStatus } from "../domain/validation";

export function ComponentPalettePanel({
  presetsOpen,
  connectivityStatus,
  onClearCanvas,
  onTogglePresets,
  onSavePreset,
  syntheticAction,
  onGoToFitting,
}: {
  presetsOpen: boolean;
  connectivityStatus: Mb3ConnectivityStatus;
  onClearCanvas: () => void;
  onTogglePresets: () => void;
  onSavePreset: () => void;
  syntheticAction?: ReactNode;
  onGoToFitting?: () => void;
}) {
  return (
    <aside className="mbv3-component-float">
      <div className="mbv3-component-actions" aria-label="Canvas actions">
        <button
          className="mbv3-component-action"
          type="button"
          title="Clear canvas"
          aria-label="Clear canvas"
          onClick={onClearCanvas}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 6h14" />
            <path d="M9 6V4h6v2" />
            <path d="M8 10v8" />
            <path d="M12 10v8" />
            <path d="M16 10v8" />
            <path d="M7 6l1 15h8l1-15" />
          </svg>
        </button>
        <button
          className="mbv3-component-action"
          type="button"
          aria-expanded={presetsOpen}
          title="Presets"
          aria-label="Presets"
          onClick={onTogglePresets}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 5h14v5H5z" />
            <path d="M5 14h14v5H5z" />
            <path d="M8 7.5h.01" />
            <path d="M8 16.5h.01" />
          </svg>
        </button>
        <button
          className="mbv3-component-action"
          type="button"
          title="Save preset"
          aria-label="Save preset"
          onClick={onSavePreset}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 4h12l2 2v14H5z" />
            <path d="M8 4v6h8V4" />
            <path d="M8 17h8" />
          </svg>
        </button>
        {syntheticAction ? <div className="mbv3-synthetic-action">{syntheticAction}</div> : null}
        <button
          className={`mbv3-fitting-action is-${connectivityStatus.level}`}
          type="button"
          title={connectivityStatus.label}
          aria-label={`Go to fitting. Circuit status: ${connectivityStatus.label}`}
          onClick={onGoToFitting}
        >
          Go to fitting
        </button>
      </div>
    </aside>
  );
}
