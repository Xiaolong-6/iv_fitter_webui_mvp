import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
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

type ComponentRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function PreviewToolbar({
  onDelete,
  onPresetsToggle,
  connected,
}: {
  onDelete: () => void;
  onPresetsToggle: (e: React.MouseEvent) => void;
  connected: boolean;
}) {
  return (
    <div className="mb-preview-toolbar" aria-label="Model Builder tools">
      <div className="mb-preview-title-card">
        <strong>Model Builder</strong>
      </div>
      <button
        type="button"
        className="mb-preview-tool-btn"
        title="Delete line/box"
        aria-label="Delete line/box"
        onClick={onDelete}
      >
        <span className="mb-preview-tool-icon">✕</span>
        <span className="mb-preview-tool-label">Delete</span>
      </button>
      <button
        type="button"
        className="mb-preview-tool-btn"
        title="Clear canvas"
        aria-label="Clear canvas"
      >
        <span className="mb-preview-tool-icon">⌫</span>
        <span className="mb-preview-tool-label">Clear</span>
      </button>
      <button
        type="button"
        className="mb-preview-tool-btn"
        title="Presets"
        aria-label="Presets"
        onClick={onPresetsToggle}
      >
        <span className="mb-preview-tool-icon">▤</span>
        <span className="mb-preview-tool-label">Presets</span>
      </button>
      <button
        type="button"
        className="mb-preview-tool-btn"
        title="Save layout"
        aria-label="Save layout"
      >
        <span className="mb-preview-tool-icon">▣</span>
        <span className="mb-preview-tool-label">Save</span>
      </button>
      <button
        type="button"
        className="mb-preview-tool-btn"
        title="Synthetic IV trace"
        aria-label="Synthetic IV trace"
      >
        <span className="mb-preview-tool-icon">IV</span>
        <span className="mb-preview-tool-label">IV</span>
      </button>
      <button
        type="button"
        className={`mb-preview-go ${connected ? "is-connected" : ""}`}
        title={connected ? "Circuit complete — go to fitting" : "V–GND not connected"}
        aria-label="Go to fitting"
      >
        Go to fitting
      </button>
    </div>
  );
}

function PreviewComponentsPanel({
  onDragStart,
  onDragEnd,
  components,
}: {
  onDragStart: (name: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
  components: PreviewComponentTemplate[];
}) {
  return (
    <aside className="mb-preview-panel mb-preview-components" aria-label="Components">
      <strong>Components</strong>
      {components.map((component) => (
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

function PreviewInspectorPanel({
  visible,
  position,
  name,
}: {
  visible: boolean;
  position: { x: number; y: number } | null;
  name: string;
}) {
  if (!visible) return null;

  const style: React.CSSProperties = position
    ? {
        position: "absolute",
        left: position.x,
        top: position.y,
        zIndex: 12,
        pointerEvents: "all",
      }
    : {};

  return (
    <aside
      className="mb-preview-panel mb-preview-inspector is-contextual"
      aria-label="Inspector"
      style={style}
    >
      <div className="mb-preview-panel-head">
        <strong>Inspector</strong>
        <span aria-hidden="true">⋮⋮</span>
      </div>
      <label>
        <span>Name</span>
        <input value={name} readOnly />
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

function PreviewPresetsPanel({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <aside className="mb-preview-panel mb-preview-presets is-contextual" aria-label="Presets">
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

  const [inspectorVisible, setInspectorVisible] = useState(false);
  const [inspectorPos, setInspectorPos] = useState<{ x: number; y: number } | null>(null);
  const [inspectorName, setInspectorName] = useState("");
  const [presetsVisible, setPresetsVisible] = useState(false);
  const [connected, setConnected] = useState(false);
  const [components, setComponents] = useState<PreviewComponentTemplate[]>(PREVIEW_COMPONENTS);

  const postToIframe = useCallback((msg: Record<string, unknown>) => {
    const frame = frameRef.current;
    if (!frame) return;
    const w = frame.contentWindow ?? window.frames[0];
    w?.postMessage(msg, window.location.origin);
  }, []);

  useEffect(() => {
    function handleMessage(e: MessageEvent) {
      const d = e.data;
      if (!d?.type) return;

      if (d.type === "ivfitter:preview-component-selected") {
        const rect = d.rect as ComponentRect | undefined;
        if (rect) {
          const shell = frameRef.current?.closest(".mb-preview-shell");
          const shellRect = shell?.getBoundingClientRect();
          if (shellRect) {
            let x = shellRect.left + rect.x + rect.width + 8;
            let y = shellRect.top + rect.y;
            if (x + 300 > window.innerWidth) {
              x = shellRect.left + rect.x - 308;
            }
            if (y + 250 > window.innerHeight) {
              y = window.innerHeight - 260;
            }
            if (y < 0) y = 8;
            setInspectorPos({ x: x - shellRect.left, y: y - shellRect.top });
          }
        }
        setInspectorName(d.label || "");
        setInspectorVisible(true);
      }

      if (d.type === "ivfitter:preview-selection-cleared") {
        setInspectorVisible(false);
        setInspectorPos(null);
      }

      if (d.type === "ivfitter:connectivity-status") {
        setConnected(Boolean(d.connected));
      }

      if (d.type === "ivfitter:preview-component-deleted" && d.id) {
        setComponents((prev) =>
          prev.map((c) => ({ ...c, status: "not added" }))
        );
      }

      if (d.type === "ivfitter:preview-component-added" && d.label) {
        setComponents((prev) =>
          prev.map((c) =>
            c.name === d.label ? { ...c, status: "added" } : c
          )
        );
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Delete" || e.key === "Backspace") {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.tagName === "SELECT")) return;
        postToIframe({ type: "ivfitter:delete-selected" });
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [postToIframe]);

  useEffect(() => {
    if (!presetsVisible) return;
    function handleOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".mb-preview-presets") && !target.closest('[aria-label="Presets"]')) {
        setPresetsVisible(false);
      }
    }
    window.addEventListener("pointerdown", handleOutside);
    return () => window.removeEventListener("pointerdown", handleOutside);
  }, [presetsVisible]);

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
      { type: "ivfitter:add-preview-component", label: name, x, y },
      window.location.origin,
    );
  };

  const handleDelete = () => {
    postToIframe({ type: "ivfitter:delete-selected" });
  };

  const handlePresetsToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPresetsVisible((v) => !v);
  };

  return (
    <div className="mb-preview-shell">
      <iframe
        ref={frameRef}
        className="mb-preview-frame"
        src="/model-builder-preview.html"
      />
      <div className="mb-preview-overlay" aria-label="Model Builder preview overlay">
        <PreviewToolbar
          onDelete={handleDelete}
          onPresetsToggle={handlePresetsToggle}
          connected={connected}
        />
        <PreviewComponentsPanel
          onDragStart={startComponentDrag}
          onDragEnd={finishComponentDrag}
          components={components}
        />
        <PreviewInspectorPanel
          visible={inspectorVisible}
          position={inspectorPos}
          name={inspectorName}
        />
        <PreviewPresetsPanel visible={presetsVisible} />
      </div>
    </div>
  );
}
