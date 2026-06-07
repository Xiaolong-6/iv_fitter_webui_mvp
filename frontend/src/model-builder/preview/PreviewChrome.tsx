import type { MouseEvent, PointerEvent, ReactNode } from "react";
import type { FloatingPosition, FloatingSize } from "./previewStorage";

type ToolIconName = "fit" | "delete" | "clear" | "components" | "presets" | "save" | "iv" | "duplicate";

export type PreviewCircuitStatus = { connected: boolean; activeWireCount: number; warnings: string[] };

function ToolIcon({ name }: { name: ToolIconName }) {
  if (name === "fit") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4H4v4M16 4h4v4M8 20H4v-4M16 20h4v-4" /><path d="M9 9h6v6H9z" /></svg>;
  if (name === "delete") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8v10M12 8v10M16 8v10" /><path d="M5 6h14M10 4h4l1 2H9l1-2Z" /><path d="M7 6l1 15h8l1-15" /></svg>;
  if (name === "clear") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 17l4 4 10-10" /><path d="M4 6h16" /><path d="M4 10h10" /></svg>;
  if (name === "components") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h7v7H6zM15 6h3v3M15 12h3v3M6 16h12" /></svg>;
  if (name === "presets") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v5H5zM5 14h14v5H5z" /><path d="M8 7.5h8M8 16.5h8" /></svg>;
  if (name === "save") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h12l2 2v12H5z" /><path d="M8 5v6h8V5" /><path d="M8 17h8" /></svg>;
  if (name === "duplicate") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h10v10H8z" /><path d="M6 16H5a1 1 0 0 1-1-1V5h10v1" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18V6M9 18V6" /><path d="M13 6l3 12 3-12" /></svg>;
}

function PreviewToolButton({ icon, label, title, onClick, className = "" }: {
  icon: ToolIconName;
  label: string;
  title: string;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return <button type="button" className={`mb-preview-tool-btn ${className}`} title={title} onClick={onClick}><ToolIcon name={icon} /><span>{label}</span></button>;
}

export function PreviewToolbar({ circuitStatus, onFitScreen, onDeleteSelected, onClearCanvas, onToggleComponents, onTogglePresets, onSaveLayout, onToggleSynthetic, onToggleExamine, onGoToFitting }: {
  circuitStatus: PreviewCircuitStatus;
  onFitScreen: () => void;
  onDeleteSelected: () => void;
  onClearCanvas: () => void;
  onToggleComponents: (event: MouseEvent<HTMLButtonElement>) => void;
  onTogglePresets: (event: MouseEvent<HTMLButtonElement>) => void;
  onSaveLayout: () => void;
  onToggleSynthetic: (event: MouseEvent<HTMLButtonElement>) => void;
  onToggleExamine: (event: MouseEvent<HTMLButtonElement>) => void;
  onGoToFitting?: () => void;
}) {
  const goTitle = circuitStatus.connected ? `V to GND path detected. ${circuitStatus.activeWireCount} active wire(s).` : (circuitStatus.warnings[0] || "No complete V to GND path yet.");
  return (
    <div className="mb-preview-toolbar" aria-label="Model Builder tools">
      <div className="mb-preview-title-card"><strong>Model Builder</strong></div>
      <div className="mb-preview-tool-stack">
        <span className="mb-preview-tool-group">View</span>
        <PreviewToolButton icon="fit" label="Fit view" title="Fit canvas to visible content" onClick={onFitScreen} />
        <span className="mb-preview-tool-group">Edit</span>
        <PreviewToolButton icon="delete" label="Delete selected" title="Delete selected line or box" onClick={onDeleteSelected} />
        <PreviewToolButton icon="clear" label="Clear model" title="Clear model" onClick={onClearCanvas} />
        <span className="mb-preview-tool-group">Model</span>
        <PreviewToolButton icon="components" label="Component" title="Show component templates" className="mb-preview-flyout-toggle mb-preview-components-toggle" onClick={onToggleComponents} />
        <PreviewToolButton icon="presets" label="Model presets" title="Show preset models" className="mb-preview-flyout-toggle mb-preview-presets-toggle" onClick={onTogglePresets} />
        <PreviewToolButton icon="save" label="Save model" title="Save model" onClick={onSaveLayout} />
        <PreviewToolButton icon="iv" label="Simulate IV" title="Simulate IV trace" className="mb-preview-flyout-toggle mb-preview-synthetic-toggle" onClick={onToggleSynthetic} />
        <PreviewToolButton icon="fit" label="Validate model" title="Validate model and inspect fitting equations" className="mb-preview-flyout-toggle mb-preview-examine-toggle" onClick={onToggleExamine} />
        <span className="mb-preview-tool-group">Next</span>
        <button
          type="button"
          className={`mb-preview-go ${circuitStatus.connected ? "is-connected" : "is-disconnected"}`}
          title={goTitle}
          disabled={!circuitStatus.connected}
          onClick={circuitStatus.connected ? onGoToFitting : undefined}
        >
          Use model for fitting
        </button>
      </div>
    </div>
  );
}

export function PreviewFlyoutPanel({ position, size, title, className = "", pinned, onTogglePinned, onStartDrag, onStartResize, children }: {
  position: FloatingPosition;
  size: FloatingSize;
  title: string;
  className?: string;
  pinned: boolean;
  onTogglePinned: () => void;
  onStartDrag: (event: PointerEvent<HTMLDivElement>) => void;
  onStartResize: (event: PointerEvent<HTMLSpanElement>) => void;
  children: ReactNode;
}) {
  return (
    <aside className={`mb-preview-panel mb-preview-flyout ${className}`} aria-label={title} style={{ left: position.x, top: position.y, width: size.width, height: size.height }}>
      <div className="mb-preview-flyout-head" onPointerDown={onStartDrag}>
        <strong>{title}</strong>
        <div className="mb-preview-flyout-controls">
          <button type="button" className={`mb-preview-pin ${pinned ? "is-pinned" : ""}`} title={pinned ? "Unpin panel" : "Pin panel"} aria-pressed={pinned} onClick={(event) => { event.stopPropagation(); onTogglePinned(); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4l6 6M9 9l6 6M15 5l-6 6-4 1 1-4 6-6M5 19l5-5" /></svg>
          </button>
          <span aria-hidden="true">::</span>
        </div>
      </div>
      <div className="mb-preview-flyout-body">{children}</div>
      <span className="mb-preview-resize-handle" aria-hidden="true" onPointerDown={onStartResize} />
    </aside>
  );
}
