import type { FitResult } from "../model/types";
import { fmtEng } from "../model/format";

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, (sorted.length - 1) * p));
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const t = idx - lo;
  return sorted[lo] * (1 - t) + sorted[hi] * t;
}

function frontendQualityFailure(result: FitResult): string | null {
  const fit = result.curves.current_fit_A ?? [];
  const meas = result.curves.current_measured_A ?? [];
  const residual = result.curves.residual_A ?? [];
  if (!fit.length || !meas.length) return "empty fit curve";

  const finiteFit = fit.filter(Number.isFinite);
  const finiteMeas = meas.filter(Number.isFinite);
  if (finiteFit.length !== fit.length || finiteMeas.length !== meas.length) return "non-finite current values";

  const absMeas = finiteMeas.map((v) => Math.abs(v)).sort((a, b) => a - b);
  const measScale = Math.max(Math.max(...absMeas, 0), percentile(absMeas, 0.95), 1e-15);
  const maxFit = Math.max(...finiteFit.map((v) => Math.abs(v)), 0);
  const finiteResidual = residual.filter(Number.isFinite);
  const maxResidual = Math.max(...finiteResidual.map((v) => Math.abs(v)), 0);
  const rmse = result.metrics.linear_rmse_A;
  const absoluteLimit = 1e3;
  const relativeFitLimit = 1e8 * measScale;
  const relativeRmseLimit = 1e7 * measScale;

  if (maxFit > Math.max(absoluteLimit, relativeFitLimit)) return "fit current explosion";
  if (maxResidual > Math.max(absoluteLimit, relativeFitLimit)) return "residual explosion";
  if (!Number.isFinite(rmse)) return "non-finite RMSE";
  if (rmse > Math.max(absoluteLimit, relativeRmseLimit)) return "RMSE explosion";
  return null;
}

import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

export function FitStatusBar({ result, language }: { result: FitResult | null; language: Language }) {
  if (!result) return <div className="status">{t(language, "readyNoFit")}</div>;

  const backendWarn = result.warnings.filter((w) => w.severity !== "error").length;
  const backendErrors = result.warnings.filter((w) => w.severity === "error").length;
  const frontendFailure = frontendQualityFailure(result);
  const errors = backendErrors + (frontendFailure ? 1 : 0);
  const rmse = result.metrics.linear_rmse_A;
  const passed = result.success && errors === 0;
  const state = passed ? t(language, "completed") : t(language, "failedQualityGate");
  const cls = passed ? "status ok" : "status bad";
  const title = frontendFailure ? `Frontend sanity check: ${frontendFailure}` : result.message;

  return <div className={cls} title={title}>
    {t(language, "fit")} {state} · RMSE {fmtEng(rmse, 4)} · {t(language, "warnings")} {backendWarn} · {t(language, "errors")} {errors}{frontendFailure ? " · " + t(language, "frontendSanity") : ""}
  </div>;
}
