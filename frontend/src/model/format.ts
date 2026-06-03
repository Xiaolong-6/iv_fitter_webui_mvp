function normalizeExponential(text: string): string {
  return text.replace(/e([+-])0+(\d+)/, "e$1$2");
}

export function fmtEng(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined) return "";
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 1e4 || abs < 1e-3) return normalizeExponential(value.toExponential(digits - 1));
  return Number(value.toPrecision(digits)).toString();
}

export function fmtBounds(lower?: number | null, upper?: number | null): string {
  const lo = lower === null || lower === undefined ? "−∞" : fmtEng(lower, 3);
  const hi = upper === null || upper === undefined ? "+∞" : fmtEng(upper, 3);
  return `${lo} – ${hi}`;
}

export function formatValueWithUnit(value: number | null | undefined, unit?: string | null, digits = 4): string {
  if (value === null || value === undefined) return "";
  if (!Number.isFinite(value)) return String(value);
  const normalizedUnit = unit ?? "";
  const abs = Math.abs(value);
  let text: string;
  if (value === 0) text = "0";
  else if (normalizedUnit === "A" || normalizedUnit === "Ω" || abs < 1e-3 || abs >= 1e4) text = normalizeExponential(value.toExponential(Math.max(digits - 1, 0)));
  else text = Number(value.toPrecision(digits)).toString();
  return normalizedUnit ? `${text} ${normalizedUnit}` : text;
}

export function parameterFitStatus(value: number | null | undefined, lower?: number | null, upper?: number | null, stderr?: number | null, fixed?: boolean): string {
  if (fixed) return "fixed";
  if (value === null || value === undefined || !Number.isFinite(value)) return "invalid";
  const scale = Math.max(Math.abs(value), 1);
  const nearLower = lower !== null && lower !== undefined && Math.abs(value - lower) <= scale * 1e-6;
  const nearUpper = upper !== null && upper !== undefined && Math.abs(value - upper) <= scale * 1e-6;
  if (nearLower) return "near lower";
  if (nearUpper) return "near upper";
  if (stderr !== null && stderr !== undefined && Number.isFinite(stderr) && value !== 0 && Math.abs(stderr / value) > 1) return "weakly identified";
  return "free";
}
