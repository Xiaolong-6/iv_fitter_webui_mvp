import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { fmtEng } from "../model/format";

type Series = {
  x: number[];
  y: number[];
  label: string;
  kind?: "line" | "points";
};

type HoverPoint = {
  label: string;
  x: number;
  y: number;
  px: number;
  py: number;
};

type SimpleChartProps = {
  title: string;
  series: Series[];
  yLabel?: string;
  robustScale?: boolean;
  annotation?: string | null;
  regions?: { x0: number; x1: number; label: string }[];
};

const VB_W = 520;
const VB_H = 248;
const MARGIN = { left: 58, right: 14, top: 30, bottom: 38 };

function finitePairs(series: Series[]) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const s of series) {
    for (let i = 0; i < Math.min(s.x.length, s.y.length); i++) {
      const x = s.x[i];
      const y = s.y[i];
      if (Number.isFinite(x) && Number.isFinite(y)) {
        xs.push(x);
        ys.push(y);
      }
    }
  }
  return { xs, ys };
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * p));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function span(values: number[], fallback: [number, number], robust = false) {
  if (!values.length) return fallback;
  let min: number;
  let max: number;
  if (robust && values.length > 12) {
    const sorted = [...values].sort((a, b) => a - b);
    min = percentile(sorted, 0.01);
    max = percentile(sorted, 0.99);
  } else {
    min = Math.min(...values);
    max = Math.max(...values);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return fallback;
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = 0.05 * (max - min);
  return [min - pad, max + pad] as [number, number];
}

function clip(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function ResetIcon() {
  return <svg className="chart-control-svg" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12a7 7 0 1 0 2.05-4.95" />
    <path d="M5 5v5h5" />
  </svg>;
}

export function SimpleChart({ title, series, yLabel, robustScale = true, annotation, regions = [] }: SimpleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: VB_W, h: VB_H });
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const [showClipInfo, setShowClipInfo] = useState(false);
  const baseX = useMemo(() => span(finitePairs(series).xs, [-1, 1], false), [series]);
  const baseY = useMemo(() => span(finitePairs(series).ys, [-1, 1], robustScale), [series, robustScale]);
  const [xView, setXView] = useState<[number, number] | null>(null);
  const [yView, setYView] = useState<[number, number] | null>(null);
  const [xmin, xmax] = xView ?? baseX;
  const [ymin, ymax] = yView ?? baseY;
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startViewX: [number, number]; startViewY: [number, number] } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { xs, ys } = useMemo(() => finitePairs(series), [series]);
  const plotW = VB_W - MARGIN.left - MARGIN.right;
  const plotH = VB_H - MARGIN.top - MARGIN.bottom;

  const sx = useCallback((x: number) => MARGIN.left + ((x - xmin) / (xmax - xmin)) * plotW, [xmin, xmax, plotW]);
  const syRaw = useCallback((y: number) => MARGIN.top + plotH - ((y - ymin) / (ymax - ymin)) * plotH, [ymin, ymax, plotH]);
  const sy = useCallback((y: number) => clip(syRaw(y), MARGIN.top, MARGIN.top + plotH), [syRaw, plotH]);
  const inYRange = useCallback((y: number) => y >= ymin && y <= ymax, [ymin, ymax]);
  const inXRange = useCallback((x: number) => x >= xmin && x <= xmax, [xmin, xmax]);
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function resetView() {
    setXView(null);
    setYView(null);
  }

  function onPointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startViewX: xView ?? baseX,
      startViewY: yView ?? baseY,
    };
    setDragging(true);
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (dragging && dragRef.current) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const dataDx = -(dx / containerSize.w) * (dragRef.current.startViewX[1] - dragRef.current.startViewX[0]);
      const dataDy = (dy / containerSize.h) * (dragRef.current.startViewY[1] - dragRef.current.startViewY[0]);
      setXView([dragRef.current.startViewX[0] + dataDx, dragRef.current.startViewX[1] + dataDx]);
      setYView([dragRef.current.startViewY[0] + dataDy, dragRef.current.startViewY[1] + dataDy]);
    } else {
      setHover(nearestPoint(e.clientX, e.clientY, e.currentTarget));
    }
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (dragging) {
      e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      dragRef.current = null;
    }
  }

  function nearestPoint(clientX: number, clientY: number, svg: SVGSVGElement): HoverPoint | null {
    const rect = svg.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * VB_W;
    const my = ((clientY - rect.top) / rect.height) * VB_H;
    let best: HoverPoint | null = null;
    let bestD = Infinity;
    for (const s of series) {
      for (let i = 0; i < Math.min(s.x.length, s.y.length); i++) {
        const x = s.x[i]; const y = s.y[i];
        if (!Number.isFinite(x) || !Number.isFinite(y) || !inXRange(x)) continue;
        const px = sx(x); const py = sy(y);
        const d = Math.hypot(px - mx, py - my);
        if (d < bestD) { bestD = d; best = { label: s.label, x, y, px, py }; }
      }
    }
    return bestD < 42 ? best : null;
  }

  function wheelZoom(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * VB_W;
    const mouseY = ((event.clientY - rect.top) / rect.height) * VB_H;
    const cx = xmin + ((mouseX - MARGIN.left) / plotW) * (xmax - xmin);
    const cy = ymax - ((mouseY - MARGIN.top) / plotH) * (ymax - ymin);
    const factor = event.deltaY > 0 ? 1.18 : 0.84;

    if (event.ctrlKey) {
      const lo = cx - (cx - xmin) * factor;
      const hi = cx + (xmax - cx) * factor;
      setXView([lo, hi]);
    } else if (event.shiftKey) {
      const lo = cy - (cy - ymin) * factor;
      const hi = cy + (ymax - cy) * factor;
      setYView([lo, hi]);
    } else {
      const xLo = cx - (cx - xmin) * factor;
      const xHi = cx + (xmax - cx) * factor;
      const yLo = cy - (cy - ymin) * factor;
      const yHi = cy + (ymax - cy) * factor;
      setXView([xLo, xHi]);
      setYView([yLo, yHi]);
    }
  }

  const clippedCount = ys.filter((y, i) => Number.isFinite(y) && (!inYRange(y) || !inXRange(xs[i]))).length;
  const tooltipW = 244;
  const tooltipH = 54;
  const tooltipX = hover ? clip(hover.px + 12, MARGIN.left + 4, VB_W - tooltipW - 8) : 0;
  const tooltipY = hover ? clip(hover.py - tooltipH - 8, MARGIN.top + 4, VB_H - tooltipH - MARGIN.bottom - 4) : 0;

  return <div className="simple-chart" ref={containerRef}>
    <div className="chart-toolbar compact-chart-toolbar" aria-label={`${title} chart controls`}>
      <div className="chart-button-group chart-control-cluster" role="group" aria-label="Chart controls" title="Wheel zooms at cursor. Ctrl+wheel: X only. Shift+wheel: Y only. Drag to pan. Double-click to reset.">
        <button className="chart-icon-button chart-reset-button" type="button" title="Reset zoom and pan" aria-label="Reset zoom and pan" onClick={resetView}>
          <ResetIcon />
        </button>
      </div>
    </div>
    <svg
      width={containerSize.w}
      height={containerSize.h}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={title}
      style={{ cursor: dragging ? "grabbing" : "crosshair" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={() => { setHover(null); if (dragging) { setDragging(false); dragRef.current = null; } }}
      onWheel={wheelZoom}
      onDoubleClick={resetView}
      tabIndex={0}
    >
      <title>{title}</title>
      <desc>{yLabel ? `${title}, ${yLabel}` : title}</desc>
      <rect x={0} y={0} width={VB_W} height={VB_H} className="chart-bg" />
      <text x={MARGIN.left} y={22} className="chart-title">{title}</text>
      {clippedCount > 0 && <g className="chart-clip-badge" onClick={() => setShowClipInfo((v) => !v)} role="button" aria-label={`${clippedCount} clipped points`}>
        <rect x={VB_W - MARGIN.right - 78} y={8} width={74} height={22} rx={11} />
        <text x={VB_W - MARGIN.right - 41} y={23} textAnchor="middle">clipped {clippedCount}</text>
        <title>{clippedCount} point(s) are outside the current robust scale or zoom window. Click to show the note.</title>
      </g>}

      {ticks.map((t) => {
        const x = MARGIN.left + t * plotW;
        const y = MARGIN.top + t * plotH;
        const xv = xmin + t * (xmax - xmin);
        const yv = ymax - t * (ymax - ymin);
        return <g key={`grid-${t}`}>
          <line x1={x} x2={x} y1={MARGIN.top} y2={MARGIN.top + plotH} className="chart-grid" />
          <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={y} y2={y} className="chart-grid" />
          <text x={x} y={VB_H - 18} textAnchor="middle" className="chart-tick">{fmtEng(xv, 3)}</text>
          <text x={MARGIN.left - 8} y={y + 4} textAnchor="end" className="chart-tick">{fmtEng(yv, 3)}</text>
        </g>;
      })}

      <line x1={MARGIN.left} x2={MARGIN.left + plotW} y1={MARGIN.top + plotH} y2={MARGIN.top + plotH} className="chart-axis" />
      <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + plotH} className="chart-axis" />
      {yLabel && <text x={16} y={MARGIN.top + plotH / 2} transform={`rotate(-90 16 ${MARGIN.top + plotH / 2})`} className="chart-label">{yLabel}</text>}
      {regions.map((region) => {
        const x0 = clip(sx(region.x0), MARGIN.left, MARGIN.left + plotW);
        const x1 = clip(sx(region.x1), MARGIN.left, MARGIN.left + plotW);
        const w = Math.max(2, Math.abs(x1 - x0));
        return <g className="chart-mismatch-region" key={`${region.x0}-${region.x1}-${region.label}`}>
          <rect x={Math.min(x0, x1)} y={MARGIN.top} width={w} height={plotH} />
          {w > 54 ? <text x={Math.min(x0, x1) + 6} y={MARGIN.top + 16}>{region.label}</text> : null}
        </g>;
      })}
      {annotation && <g className="chart-annotation">
        <rect x={MARGIN.left + 12} y={MARGIN.top + 12} width={Math.min(360, plotW - 24)} height={46} rx={8} />
        <text x={MARGIN.left + 24} y={MARGIN.top + 31}>{annotation.slice(0, 86)}</text>
        {annotation.length > 86 ? <text x={MARGIN.left + 24} y={MARGIN.top + 47}>{annotation.slice(86, 158)}</text> : null}
      </g>}

      {series.map((s, idx) => {
        let pts = s.x.map((x, i) => [x, s.y[i]] as [number, number]).filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y) && inXRange(x));
        if (s.kind === "line") pts = [...pts].sort((a, b) => a[0] - b[0]);
        const d = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${sx(x)} ${sy(y)}`).join(" ");
        const cls = idx % 2 === 0 ? "chart-series-a" : "chart-series-b";
        return <g key={s.label}>
          {s.kind !== "points" && pts.length > 1 && <path d={d} className={`chart-line ${cls}`} />}
          {(s.kind === "points" || pts.length <= 80) && pts.map(([x, y], i) => <circle key={i} cx={sx(x)} cy={sy(y)} r={2.2} className={`chart-point ${cls}`} />)}
        </g>;
      })}

      <g transform={`translate(${MARGIN.left + 8}, ${MARGIN.top + 10})`}>
        {series.map((s, idx) => <g key={s.label} transform={`translate(0, ${idx * 16})`}>
          <rect width={10} height={10} className={idx === 0 ? "chart-series-a-fill" : "chart-series-b-fill"} />
          <text x={16} y={9} className="chart-legend">{s.label}</text>
        </g>)}
      </g>

      {hover && <g className="chart-hover" aria-live="polite">
        <line x1={hover.px} x2={hover.px} y1={MARGIN.top} y2={MARGIN.top + plotH} />
        <circle cx={hover.px} cy={hover.py} r={4.5} />
        <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={7} />
        <text x={tooltipX + 10} y={tooltipY + 16}>{hover.label}</text>
        <text x={tooltipX + 10} y={tooltipY + 32}>V = {fmtEng(hover.x, 6)}</text>
        <text x={tooltipX + 10} y={tooltipY + 47}>Y = {fmtEng(hover.y, 6)}</text>
      </g>}
      {showClipInfo && <g className="chart-clip-info">
        <rect x={VB_W - MARGIN.right - 246} y={34} width={238} height={42} rx={8} />
        <text x={VB_W - MARGIN.right - 236} y={52}>{clippedCount} point(s) outside visible scale.</text>
        <text x={VB_W - MARGIN.right - 236} y={68}>Use reset or inspect anomalies.</text>
      </g>}
    </svg>
  </div>;
}
