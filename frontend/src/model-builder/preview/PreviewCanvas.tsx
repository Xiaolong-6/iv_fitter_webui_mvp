import "../styles/preview-canvas.css";

export function PreviewCanvas() {
  return (
    <div className="mb-preview-shell">
      <iframe
        className="mb-preview-frame"
        title="Model Builder canvas preview"
        src="/model-builder-preview.html"
      />
    </div>
  );
}
