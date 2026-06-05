import { useRef, type DragEvent } from "react";
import "../styles/preview-canvas.css";

type PreviewComponentTemplate = {
  name: string;
  status: string;
};

const PREVIEW_COMPONENTS: PreviewComponentTemplate[] = [
  { name: "Resistance", status: "not added" },
  { name: "Shockley diode", status: "not added" },
  { name: "Constant current", status: "not added" },
  { name: "Custom", status: "not added" },
];

function PreviewToolbar() {
  return (
    <div className="mb-preview-toolbar" aria-label="Model Builder tools">
      <div className="mb-preview-title-card">
        <strong>Model Builder</strong>
      </div>
      <button type="button" title="Clear canvas" aria-label="Clear canvas">⌫</button>
      <button type="button" title="Presets" aria-label="Presets">▤</button>
      <button type="button" title="Save" aria-label="Save">▣</button>
      <button type="button" title="Synthetic IV trace" aria-label="Synthetic IV trace">IV</button>
      <button type="button" className="mb-preview-go" title="Go to fitting" aria-label="Go to fitting">
        Go to fitting
      </button>
    </div>
  );
}

function PreviewComponentsPanel({
  onDragStart,
  onDragEnd,
}: {
  onDragStart: (name: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <aside className="mb-preview-panel mb-preview-components" aria-label="Components">
      <strong>Components</strong>
      {PREVIEW_COMPONENTS.map((component) => (
        <div
          key={component.name}
          className="mb-preview-list-item is-draggable"
          draggable
          onDragStart={(event) => onDragStart(component.name, event)}
          onDragEnd={onDragEnd}
        >
          <span>{component.name}</span>
          <small>{component.status}</small>
        </div>
      ))}
    </aside>
  );
}

function PreviewInspectorPanel() {
  return (
    <aside className="mb-preview-panel mb-preview-inspector" aria-label="Inspector">
      <div className="mb-preview-panel-head">
        <strong>Inspector</strong>
        <span aria-hidden="true">⋮⋮</span>
      </div>
      <p>Select a component on the canvas or from Components to inspect its details.</p>
      <label>
        <span>Name</span>
        <input value="Template preview" readOnly />
      </label>
      <label>
        <span>Behavior</span>
        <select value="I_of_V" disabled>
          <option>I_of_V</option>
        </select>
      </label>
      <label>
        <span>Expression</span>
        <textarea value="I0*(exp(V/(n*kB*T))-1)" readOnly />
      </label>
    </aside>
  );
}

function PreviewPresetsPanel() {
  return (
    <aside className="mb-preview-panel mb-preview-presets" aria-label="Presets">
      <strong>Presets</strong>
      <div className="mb-preview-list-item">
        <span>Single diode model</span>
        <small>Built-in</small>
      </div>
      <div className="mb-preview-list-item">
        <span>Two diode model</span>
        <small>Built-in</small>
      </div>
    </aside>
  );
}

export function PreviewCanvas() {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const draggedComponentRef = useRef<string | null>(null);

  const startComponentDrag = (name: string, event: DragEvent<HTMLDivElement>) => {
    draggedComponentRef.current = name;
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData("text/plain", name);
  };

  const finishComponentDrag = (event: DragEvent<HTMLDivElement>) => {
    const name = draggedComponentRef.current;
    draggedComponentRef.current = null;
    const frame = frameRef.current;
        if (!name || !frame) return;

    const rect = frame.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

    const previewWindow = frame.contentWindow ?? window.frames[0];
    if (!previewWindow) return;

    previewWindow.postMessage(
      {
        type: "ivfitter:add-preview-component",
        label: name,
        x,
        y,
      },
      window.location.origin,
    );
  };

return (
    <div className="mb-preview-shell">
      <iframe
        ref={frameRef}
        className="mb-preview-frame"
        title="Model Builder canvas preview"
        src="/model-builder-preview.html"
      />
      <div className="mb-preview-overlay" aria-label="Model Builder preview overlay">
        <PreviewToolbar />
        <div className="mb-preview-floating-panels">
          <PreviewComponentsPanel
            onDragStart={startComponentDrag}
            onDragEnd={finishComponentDrag}
          />
          <PreviewInspectorPanel />
          <PreviewPresetsPanel />
        </div>
      </div>
    </div>
  );
}
