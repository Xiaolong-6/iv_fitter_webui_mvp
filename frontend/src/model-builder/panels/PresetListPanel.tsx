import type { Mb3SavedPreset } from "../domain/presets";

export function PresetListPanel({
  presets,
  onLoadPreset,
  onDeletePreset,
}: {
  presets: Mb3SavedPreset[];
  onLoadPreset: (preset: Mb3SavedPreset) => void;
  onDeletePreset: (preset: Mb3SavedPreset) => void;
}) {
  return (
    <aside className="mbv3-preset-float" aria-label="Saved presets" onPointerDown={(event) => event.stopPropagation()}>
      <strong>Presets</strong>
      <div className="mbv3-preset-list">
        {presets.length > 0 ? (
          presets.map((preset) => (
            <div className="mbv3-preset-item-row" key={preset.id}>
              <button className="mbv3-preset-item" type="button" onClick={() => onLoadPreset(preset)}>
                <span>
                  {preset.name}
                  {preset.builtIn ? (
                    <small className="mbv3-preset-badge" aria-label="System preset">
                      sys
                    </small>
                  ) : null}
                </span>
                <small>{preset.builtIn ? "Built-in" : new Date(preset.updatedAt).toLocaleString()}</small>
              </button>
              {!preset.builtIn ? (
                <button
                  className="mbv3-preset-delete"
                  type="button"
                  aria-label={`Delete ${preset.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeletePreset(preset);
                  }}
                >
                  x
                </button>
              ) : null}
            </div>
          ))
        ) : (
          <p className="mbv3-preset-empty">No presets saved yet.</p>
        )}
      </div>
    </aside>
  );
}
