import type { FitResult } from "../model/types";
import { fmtEng } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { currentDataScale, fitQualityVerdict } from "../model/diagnostics";

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

export function FitStatusBar({
  result,
  language,
  onCheckLogIv,
  onAdjustInitials,
}: {
  result: FitResult | null;
  language: Language;
  onCheckLogIv?: () => void;
  onAdjustInitials?: () => void;
}) {
  if (!result) return <div className="status">{t(language, "readyNoFit")}</div>;

  const backendWarn = result.warnings.filter((w) => w.severity !== "error").length;
  const backendErrors = result.warnings.filter((w) => w.severity === "error").length;
  const frontendFailure = frontendQualityFailure(result);
  const errors = backendErrors;
  const rmse = result.metrics.linear_rmse_A;
  const logExcluded = result.metrics.log_points_excluded ?? 0;
  const passed = (result.reportable ?? result.success) && result.success && errors === 0;
  const title = result.reportability_reason ?? result.message;
  const verdict = fitQualityVerdict(result, language);
  const scale = currentDataScale(result.curves.current_measured_A);
  const rmseRatio = Number.isFinite(rmse) && scale > 0 ? rmse / scale : Infinity;
  const stateLabel = passed ? "Converged" : "Not reportable";
  const statusClass = verdict.severity === "ok" ? "status ok" : verdict.severity === "warning" ? "status warn" : "status bad";

  return <div className="fit-status-stack">
    <div className={statusClass} title={title}>
      {language === "zh" ? (passed ? "已收敛" : "暂不可报告") : stateLabel} | RMSE {fmtEng(rmse, 4)} A ({fmtEng(rmseRatio, 3)}x {language === "zh" ? "数据量级" : "data scale"}) | Log MAE excludes {Math.round(logExcluded)} near-zero point(s) | {backendWarn} {language === "zh" ? "个 warning" : "warning(s)"} | {errors} {language === "zh" ? "个 error" : "error(s)"}{frontendFailure ? " | " + t(language, "frontendSanity") : ""}
    </div>
    <div className={`fit-verdict ${verdict.severity}`}>
      <strong>{verdict.title}</strong>
      <span>{verdict.message}</span>
      <div className="fit-verdict-actions">
        <button type="button" onClick={onCheckLogIv}>{language === "zh" ? "查看 Log I-V" : "Check log I-V"}</button>
        <button type="button" onClick={onAdjustInitials}>{language === "zh" ? "调整初值" : "Adjust initials"}</button>
      </div>
    </div>
  </div>;
}
