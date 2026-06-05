import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import "../styles/preview-canvas.css";

type PreviewComponentTemplate = {
  name: string;
  status: string;
  behavior: string;
  expression: string;
};

type PreviewCanvasComponent = {
  id: string;
  name: string;
  behavior: string;
  expression: string;
};

type PreviewBoxRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CircuitStatus = {
  connected: boolean;
  activeWireCount: number;
};

const PREVIEW_COMPONENTS: PreviewComponentTemplate[] = [
  { name: "Resistance", status: "not added", behavior: "R_of_V", expression: "V/R" },
  { name: "Shockley diode", status: "not added", behavior: "I_of_V", expression: "I0*(exp(V/(n*kB*T))-1)" },
  { name: "Constant current", status: "not added", behavior: "I_of_V", expression: "I0" },
  { name: "Custom", status: "not added", behavior: "I_of_V", expression: "custom_expression" },
];

const INSPECTOR_SIZE = { width: 300, height: 360 };
const INSPECTOR_GAP = 12;

function ToolIcon({ name }: { name: "delete" | "clear" | "presets" | "save" | "iv" | "fit" }) {
  if (name === "delete") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 7h12" />
        <path d="M9 7V5h6v2" />
        <path d="M8 10l8 8" />
        <path d="M16 10l-8 8" />
      </svg>
    );
  }

  if (name === "clear") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 7h14" />
        <path d="M8 7V5h8v2" />
        <path d="M8 10v8" />
        <path d="M12 10v8" />
        <path d="M16 10v8" />
      </svg>
    );
  }

  if (name === "presets") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="5" y="5" width="14" height="5" rx="1.5" />
        <rect x="5" y="14" width="14" height="5" rx="1.5" />
      </svg>
    );
  }

  if (name === "save") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 5h10l2 2v12H6z" />
        <path d="M9 5v5h6V5" />
        <path d="M9 16h6" />
      </svg>
    );
  }

  if (name === "iv") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 17c3-8 5-8 8 0s4 8 6 0" />
        <path d="M5 20h14" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h12" />
      <path d="M13 8l4 4-4 4" />
      <path d="M5 6h7" />
      <path d="M5 18h7" />
    </svg>
  );
}

function PreviewToolButton({
  icon,
  label,
  title,
  className,
  onClick,
}: {
  icon: "delete" | "clear" | "presets" | "save" | "iv" | "fit";
  label: string;
  title: string;
  className?: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button type="button" className={className} title={title} aria-label={title} onClick={onClick}>
      <ToolIcon name={icon} />
      <span>{label}</span>
    </button>
  );
}

function PreviewToolbar({
  countsByName,
  onDragStart,
  onDragEnd,
  onTogglePresets,
  circuitStatus,
  onDeleteSelected,
}: {
  countsByName: Record<string, number>;
  onDragStart: (name: string, event: DragEvent<HTMLDivElement>) => void;
  onDragEnd: (event: DragEvent<HTMLDivElement>) => void;
  onTogglePresets: (event: MouseEvent<HTMLButtonElement>) => void;
  circuitStatus: CircuitStatus;
  onDeleteSelected: () => void;
}) {
  const fittingTitle = circuitStatus.connected
    ? `Go to fitting: V to GND is connected (${circuitStatus.activeWireCount} active wires).`
    : "Go to fitting: no complete V-to-GND path yet.";

  return (
    <div className="mb-preview-toolbar" aria-label="Model Builder tools">
      <div className="mb-preview-title-card">
        <strong>Model Builder</strong>
      </div>
      <div className="mb-preview-tool-stack">
        <PreviewToolButton icon="delete" label="Delete line/box" title="Delete line/box" onClick={onDeleteSelected} />
        <PreviewToolButton icon="clear" label="Clear canvas" title="Clear canvas" />
        <PreviewToolButton
          icon="presets"
          label="Presets"
          title="Presets"
          className="mb-preview-presets-toggle"
          onClick={onTogglePresets}
        />
        <PreviewToolButton icon="save" label="Save layout" title="Save layout" />
        <PreviewToolButton icon="iv" label="Synthetic IV" title="Synthetic IV trace" />
        <button
          type="button"
          className={`mb-preview-go ${circuitStatus.connected ? "is-connected" : "is-disconnected"}`}
          title={fittingTitle}
          aria-label={fittingTitle}
        >
          Go to fitting
        </button>
      </div>
      <PreviewComponentsPanel
        countsByName={countsByName}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      />
    </div>
  );
}

function PreviewComponentsPanel({
  countsByName,
  onDragStart,
  onDragEnd,
}: {
  countsByName: Record<string, number>;
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
          <small>{countsByName[component.name] ? `${countsByName[component.name]} added` : component.status}</small>
        </div>
      ))}
    </aside>
  );
}

function PreviewInspectorPanel({
  component,
  position,
  onDragStart,
}: {
  component: PreviewCanvasComponent | null;
  position: { x: number; y: number } | null;
  onDragStart: (event: PointerEvent<HTMLElement>) => void;
}) {
  if (!component || !position) return null;

  return (
    <aside
      className="mb-preview-panel mb-preview-inspector is-contextual"
      aria-label="Inspector"
      style={{ left: position.x, top: position.y }}
    >
      <div className="mb-preview-panel-head">
        <strong>Inspector</strong>
        <span
          className="mb-preview-inspector-grip"
          aria-hidden="true"
          onPointerDown={onDragStart}
        >
          ::
        </span>
      </div>
      <p>Preview details for the selected canvas component.</p>
      <label>
        <span>Name</span>
        <input value={component.name} readOnly />
      </label>
      <label>
        <span>Behavior</span>
        <select value={component.behavior} disabled>
          <option>R_of_V</option>
          <option>I_of_V</option>
          <option>V_of_I</option>
        </select>
      </label>
      <label>
        <span>Expression</span>
        <textarea value={component.expression} readOnly />
      </label>
    </aside>
  );
}

function PreviewPresetsPanel({ position }: { position: { x: number; y: number } }) {
  return (
    <aside className="mb-preview-panel mb-preview-presets" aria-label="Presets" style={{ left: position.x, top: position.y }}>
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

function positionInspectorNearBox(
  shell: HTMLDivElement | null,
  frame: HTMLIFrameElement | null,
  boxRect: PreviewBoxRect,
): { x: number; y: number } {
  const shellRect = shell?.getBoundingClientRect();
  const frameRect = frame?.getBoundingClientRect();
  if (!shellRect || !frameRect) return { x: 320, y: 80 };

  const boxX = frameRect.left - shellRect.left + boxRect.x;
  const boxY = frameRect.top - shellRect.top + boxRect.y;
  const rightX = boxX + boxRect.width + INSPECTOR_GAP;
  const leftX = boxX - INSPECTOR_SIZE.width - INSPECTOR_GAP;
  const preferredY = boxY;
  const maxX = shellRect.width - INSPECTOR_SIZE.width - INSPECTOR_GAP;
  const maxY = shellRect.height - INSPECTOR_SIZE.height - INSPECTOR_GAP;

  const x = rightX <= maxX ? rightX : Math.max(INSPECTOR_GAP, leftX);
  const y = Math.max(INSPECTOR_GAP, Math.min(preferredY, maxY));
  return { x, y };
}

export function PreviewCanvas() {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const draggedComponentRef = useRef<string | null>(null);
  const inspectorDragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const [canvasComponents, setCanvasComponents] = useState<PreviewCanvasComponent[]>([]);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [inspectorPosition, setInspectorPosition] = useState<{ x: number; y: number } | null>(null);
  const [presetsPosition, setPresetsPosition] = useState<{ x: number; y: number } | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<CircuitStatus>({ connected: false, activeWireCount: 0 });
  const selectedComponent = canvasComponents.find((component) => component.id === selectedComponentId) ?? null;
  const countsByName = useMemo(
    () =>
      canvasComponents.reduce<Record<string, number>>((counts, component) => {
        counts[component.name] = (counts[component.name] ?? 0) + 1;
        return counts;
      }, {}),
    [canvasComponents],
  );

  useEffect(() => {
    const receiveCanvasMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as {
        type?: string;
        id?: string;
        label?: string;
        rect?: PreviewBoxRect;
        connected?: boolean;
        activeWireCount?: number;
      };

      if (data.type === "ivfitter:preview-circuit-status") {
        setCircuitStatus({
          connected: data.connected === true,
          activeWireCount: Number.isFinite(data.activeWireCount) ? Number(data.activeWireCount) : 0,
        });
        return;
      }

      if (data.type === "ivfitter:preview-selection-cleared") {
        setSelectedComponentId(null);
        setInspectorPosition(null);
        setPresetsPosition(null);
        return;
      }

      if (data.type === "ivfitter:preview-component-deleted") {
        if (data.id) {
          setCanvasComponents((current) => current.filter((component) => component.id !== data.id));
        }
        setSelectedComponentId(null);
        setInspectorPosition(null);
        return;
      }

      if (!data.id || !data.label) return;

      if (data.type === "ivfitter:preview-component-added") {
        const template = PREVIEW_COMPONENTS.find((component) => component.name === data.label);
        const nextComponent: PreviewCanvasComponent = {
          id: data.id,
          name: data.label,
          behavior: template?.behavior ?? "I_of_V",
          expression: template?.expression ?? "custom_expression",
        };
        setCanvasComponents((current) => {
          const withoutDuplicate = current.filter((component) => component.id !== nextComponent.id);
          return [...withoutDuplicate, nextComponent];
        });
        setSelectedComponentId(null);
        setInspectorPosition(null);
        return;
      }

      if (data.type === "ivfitter:preview-component-selected") {
        setSelectedComponentId(data.id);
      }

      if (data.rect) {
        setInspectorPosition(positionInspectorNearBox(shellRef.current, frameRef.current, data.rect));
      }
    };

    window.addEventListener("message", receiveCanvasMessage);
    return () => window.removeEventListener("message", receiveCanvasMessage);
  }, []);

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

  const sendPreviewCommand = (type: string) => {
    const previewWindow = frameRef.current?.contentWindow ?? window.frames[0];
    if (!previewWindow) return;
    previewWindow.postMessage({ type }, window.location.origin);
  };

  const deleteSelected = () => {
    sendPreviewCommand("ivfitter:delete-selected");
    setSelectedComponentId(null);
    setInspectorPosition(null);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select")) return;
      event.preventDefault();
      deleteSelected();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const togglePresets = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const shellRect = shellRef.current?.getBoundingClientRect();
    const buttonRect = event.currentTarget.getBoundingClientRect();
    if (!shellRect) return;

    setPresetsPosition((current) =>
      current
        ? null
        : {
            x: buttonRect.right - shellRect.left + INSPECTOR_GAP,
            y: buttonRect.top - shellRect.top,
          },
    );
  };

  const hideFloatingMenus = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest(".mb-preview-presets") || target.closest(".mb-preview-presets-toggle")) return;
    setPresetsPosition(null);
  };

  const clampInspector = (x: number, y: number) => {
    const shellRect = shellRef.current?.getBoundingClientRect();
    if (!shellRect) return { x, y };

    return {
      x: Math.max(INSPECTOR_GAP, Math.min(x, shellRect.width - INSPECTOR_SIZE.width - INSPECTOR_GAP)),
      y: Math.max(INSPECTOR_GAP, Math.min(y, shellRect.height - INSPECTOR_SIZE.height - INSPECTOR_GAP)),
    };
  };

  const startInspectorDrag = (event: PointerEvent<HTMLElement>) => {
    if (!inspectorPosition) return;
    event.preventDefault();
    event.stopPropagation();
    inspectorDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: inspectorPosition.x,
      originY: inspectorPosition.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveInspector = (event: PointerEvent<HTMLDivElement>) => {
    const drag = inspectorDragRef.current;
    if (!drag) return;
    const next = clampInspector(
      drag.originX + event.clientX - drag.startX,
      drag.originY + event.clientY - drag.startY,
    );
    setInspectorPosition(next);
  };

  const finishInspectorDrag = () => {
    inspectorDragRef.current = null;
  };

  return (
    <div
      ref={shellRef}
      className="mb-preview-shell"
      onPointerMove={moveInspector}
      onPointerUp={finishInspectorDrag}
      onPointerCancel={finishInspectorDrag}
    >
      <iframe
        ref={frameRef}
        className="mb-preview-frame"
        title=""
        src="/model-builder-preview.html"
      />
      <div className="mb-preview-overlay" aria-label="Model Builder preview overlay" onPointerDownCapture={hideFloatingMenus}>
        <PreviewToolbar
          countsByName={countsByName}
          onDragStart={startComponentDrag}
          onDragEnd={finishComponentDrag}
          onTogglePresets={togglePresets}
          circuitStatus={circuitStatus}
          onDeleteSelected={deleteSelected}
        />
        {presetsPosition ? <PreviewPresetsPanel position={presetsPosition} /> : null}
        <PreviewInspectorPanel
          component={selectedComponent}
          position={inspectorPosition}
          onDragStart={startInspectorDrag}
        />
      </div>
    </div>
  );
}
