export function fmtEng(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined) return "";
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e4 || abs < 1e-3) return value.toExponential(digits - 1);
  return Number(value.toPrecision(digits)).toString();
}

export function fmtBounds(lower?: number | null, upper?: number | null): string {
  const lo = lower === null || lower === undefined ? "−∞" : fmtEng(lower, 3);
  const hi = upper === null || upper === undefined ? "+∞" : fmtEng(upper, 3);
  return `${lo} – ${hi}`;
}
