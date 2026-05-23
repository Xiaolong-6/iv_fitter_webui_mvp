import { useMemo, useState } from "react";
import type { WheelEvent } from "react";
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
  height?: number;
  robustScale?: boolean;
  annotation?: string | null;
  regions?: { x0: number; x1: number; label: string }[];
};

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
function zoomSpan([lo, hi]: [number, number], factor: number): [number, number] {
  const c = (lo + hi) / 2;
  const half = ((hi - lo) * factor) / 2;
  return [c - half, c + half];
}
function panSpan([lo, hi]: [number, number], frac: number): [number, number] {
  const d = (hi - lo) * frac;
  return [lo + d, hi + d];
}

export function SimpleChart({ title, series, yLabel, height = 248, robustScale = true, annotation, regions = [] }: SimpleChartProps) {
  const width = 520;
  const margin = { left: 58, right: 14, top: 30, bottom: 38 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const { xs, ys } = useMemo(() => finitePairs(series), [series]);
  const [hover, setHover] = useState<HoverPoint | null>(null);
  const [showClipInfo, setShowClipInfo] = useState(false);
  const baseX = span(xs, [-1, 1], false);
  const baseY = span(ys, [-1, 1], robustScale);
  const [xView, setXView] = useState<[number, number] | null>(null);
  const [yView, setYView] = useState<[number, number] | null>(null);
  const [xmin, xmax] = xView ?? baseX;
  const [ymin, ymax] = yView ?? baseY;

  const sx = (x: number) => margin.left + ((x - xmin) / (xmax - xmin)) * plotW;
  const syRaw = (y: number) => margin.top + plotH - ((y - ymin) / (ymax - ymin)) * plotH;
  const sy = (y: number) => clip(syRaw(y), margin.top, margin.top + plotH);
  const inYRange = (y: number) => y >= ymin && y <= ymax;
  const inXRange = (x: number) => x >= xmin && x <= xmax;
  const ticks = [0, 0.25, 0.5, 0.75, 1];

  function nearestPoint(clientX: number, clientY: number, svg: SVGSVGElement): HoverPoint | null {
    const rect = svg.getBoundingClientRect();
    const mx = ((clientX - rect.left) / rect.width) * width;
    const my = ((clientY - rect.top) / rect.height) * height;
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

  function wheelZoom(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();
    const factor = event.deltaY > 0 ? 1.18 : 0.84;
    if (event.shiftKey) setYView((current) => zoomSpan(current ?? baseY, factor));
    else setXView((current) => zoomSpan(current ?? baseX, factor));
  }

  const clippedCount = ys.filter((y, i) => Number.isFinite(y) && (!inYRange(y) || !inXRange(xs[i]))).length;
  const tooltipW = 244;
  const tooltipH = 54;
  const tooltipX = hover ? clip(hover.px + 12, margin.left + 4, width - tooltipW - 8) : 0;
  const tooltipY = hover ? clip(hover.py - tooltipH - 8, margin.top + 4, height - tooltipH - margin.bottom - 4) : 0;

  return <div className="simple-chart">
    <div className="chart-toolbar">
      <span className="muted">wheel: X zoom · Shift+wheel: Y zoom</span>
      <button onClick={() => setXView((v) => zoomSpan(v ?? baseX, 0.84))}>X+</button>
      <button onClick={() => setXView((v) => zoomSpan(v ?? baseX, 1.18))}>X−</button>
      <button onClick={() => setYView((v) => zoomSpan(v ?? baseY, 0.84))}>Y+</button>
      <button onClick={() => setYView((v) => zoomSpan(v ?? baseY, 1.18))}>Y−</button>
      <button onClick={() => setXView((v) => panSpan(v ?? baseX, -0.18))}>←</button>
      <button onClick={() => setXView((v) => panSpan(v ?? baseX, 0.18))}>→</button>
      <button onClick={() => { setXView(null); setYView(null); }}>Reset</button>
    </div>
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={title}
      onMouseMove={(e) => setHover(nearestPoint(e.clientX, e.clientY, e.currentTarget))}
      onMouseLeave={() => setHover(null)}
      onWheel={wheelZoom}
      tabIndex={0}
    >
      <title>{title}</title>
      <desc>{yLabel ? `${title}, ${yLabel}` : title}</desc>
      <rect x={0} y={0} width={width} height={height} className="chart-bg" />
      <text x={margin.left} y={22} className="chart-title">{title}</text>
      {clippedCount > 0 && <g className="chart-clip-badge" onClick={() => setShowClipInfo((v) => !v)} role="button" aria-label={`${clippedCount} clipped points`}>
        <rect x={width - margin.right - 78} y={8} width={74} height={22} rx={11} />
        <text x={width - margin.right - 41} y={23} textAnchor="middle">clipped {clippedCount}</text>
        <title>{clippedCount} point(s) are outside the current robust scale or zoom window. Click to show the note.</title>
      </g>}

      {ticks.map((t) => {
        const x = margin.left + t * plotW;
        const y = margin.top + t * plotH;
        const xv = xmin + t * (xmax - xmin);
        const yv = ymax - t * (ymax - ymin);
        return <g key={`grid-${t}`}>
          <line x1={x} x2={x} y1={margin.top} y2={margin.top + plotH} className="chart-grid" />
          <line x1={margin.left} x2={margin.left + plotW} y1={y} y2={y} className="chart-grid" />
          <text x={x} y={height - 18} textAnchor="middle" className="chart-tick">{fmtEng(xv, 3)}</text>
          <text x={margin.left - 8} y={y + 4} textAnchor="end" className="chart-tick">{fmtEng(yv, 3)}</text>
        </g>;
      })}

      <line x1={margin.left} x2={margin.left + plotW} y1={margin.top + plotH} y2={margin.top + plotH} className="chart-axis" />
      <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + plotH} className="chart-axis" />
      {yLabel && <text x={16} y={margin.top + plotH / 2} transform={`rotate(-90 16 ${margin.top + plotH / 2})`} className="chart-label">{yLabel}</text>}
      {regions.map((region) => {
        const x0 = clip(sx(region.x0), margin.left, margin.left + plotW);
        const x1 = clip(sx(region.x1), margin.left, margin.left + plotW);
        const w = Math.max(2, Math.abs(x1 - x0));
        return <g className="chart-mismatch-region" key={`${region.x0}-${region.x1}-${region.label}`}>
          <rect x={Math.min(x0, x1)} y={margin.top} width={w} height={plotH} />
          {w > 54 ? <text x={Math.min(x0, x1) + 6} y={margin.top + 16}>{region.label}</text> : null}
        </g>;
      })}
      {annotation && <g className="chart-annotation">
        <rect x={margin.left + 12} y={margin.top + 12} width={Math.min(360, plotW - 24)} height={46} rx={8} />
        <text x={margin.left + 24} y={margin.top + 31}>{annotation.slice(0, 86)}</text>
        {annotation.length > 86 ? <text x={margin.left + 24} y={margin.top + 47}>{annotation.slice(86, 158)}</text> : null}
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

      <g transform={`translate(${margin.left + 8}, ${margin.top + 10})`}>
        {series.map((s, idx) => <g key={s.label} transform={`translate(0, ${idx * 16})`}>
          <rect width={10} height={10} className={idx === 0 ? "chart-series-a-fill" : "chart-series-b-fill"} />
          <text x={16} y={9} className="chart-legend">{s.label}</text>
        </g>)}
      </g>

      {hover && <g className="chart-hover" aria-live="polite">
        <line x1={hover.px} x2={hover.px} y1={margin.top} y2={margin.top + plotH} />
        <circle cx={hover.px} cy={hover.py} r={4.5} />
        <rect x={tooltipX} y={tooltipY} width={tooltipW} height={tooltipH} rx={7} />
        <text x={tooltipX + 10} y={tooltipY + 16}>{hover.label}</text>
        <text x={tooltipX + 10} y={tooltipY + 32}>V = {fmtEng(hover.x, 6)}</text>
        <text x={tooltipX + 10} y={tooltipY + 47}>Y = {fmtEng(hover.y, 6)}</text>
      </g>}
      {showClipInfo && <g className="chart-clip-info">
        <rect x={width - margin.right - 246} y={34} width={238} height={42} rx={8} />
        <text x={width - margin.right - 236} y={52}>{clippedCount} point(s) outside visible scale.</text>
        <text x={width - margin.right - 236} y={68}>Use reset or inspect anomalies.</text>
      </g>}
    </svg>
  </div>;
}
