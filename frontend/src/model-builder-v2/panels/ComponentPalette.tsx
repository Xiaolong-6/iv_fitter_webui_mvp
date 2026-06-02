import { componentCatalog } from "../domain/componentCatalog";

export function ComponentPalette({ onSelectPreset }: { onSelectPreset: (presetId: string) => void }) {
  const groups = Array.from(new Set(componentCatalog.map((preset) => preset.group)));
  return (
    <aside className="mbv2-palette" aria-label="Component palette">
      <div className="mbv2-panel-title">Component functions</div>
      <p className="mbv2-panel-help">Drag a two-terminal behavior into the canvas, then wire its ports. R and diode are presets of R(V) or I(V).</p>
      {groups.map((group) => (
        <section key={group} className="mbv2-palette-group">
          <h3>{group}</h3>
          {componentCatalog.filter((preset) => preset.group === group).map((preset) => (
            <button
              key={preset.id}
              type="button"
              draggable
              onClick={() => onSelectPreset(preset.id)}
              onDragStart={(event) => {
                event.dataTransfer.setData("application/x-ivfitter-component-preset", preset.id);
                event.dataTransfer.effectAllowed = "copy";
              }}
              className="mbv2-palette-item"
              title={preset.description}
            >
              <span>{preset.label}</span>
              <small>{preset.behavior.replace(/_/g, " ")}</small>
            </button>
          ))}
        </section>
      ))}
    </aside>
  );
}
