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
  isFitting = false,
  elapsedSeconds = 0,
}: {
  result: FitResult | null;
  language: Language;
  isFitting?: boolean;
  elapsedSeconds?: number;
}) {
  if (isFitting) return <div className="fit-status-compact">
    <span className="fit-status-badge info">{language === "zh" ? "运行中" : "Running"}</span>
    <span className="fit-status-badge metric">{elapsedSeconds}s</span>
  </div>;

  if (!result) return <div className="fit-status-compact">
    <span className="fit-status-badge info">{t(language, "readyNoFit")}</span>
  </div>;

  const backendWarn = result.warnings.filter((w) => w.severity !== "error").length;
  const backendErrors = result.warnings.filter((w) => w.severity === "error").length;
  const frontendFailure = frontendQualityFailure(result);
  const errors = backendErrors;
  const rmse = result.metrics.linear_rmse_A;
  const passed = (result.reportable ?? result.success) && result.success && errors === 0;
  const title = result.reportability_reason ?? result.message;
  const scale = currentDataScale(result.curves.current_measured_A);
  const rmseRatio = Number.isFinite(rmse) && scale > 0 ? rmse / scale : Infinity;
  const stateLabel = passed ? "Converged" : "Not reportable";
  const statusClass = passed ? "fit-status-badge success" : "fit-status-badge danger";

  return <div className="fit-status-compact" title={title}>
    <span className={statusClass}>{language === "zh" ? (passed ? "已收敛" : "暂不可报告") : stateLabel}</span>
    <span className="fit-status-badge metric">RMSE {fmtEng(rmse, 4)} A</span>
    <span className="fit-status-badge metric">{fmtEng(rmseRatio, 3)}× {language === "zh" ? "数据量级" : "scale"}</span>
    <span className={backendWarn > 0 ? "fit-status-badge warning" : "fit-status-badge metric"}>{backendWarn} {language === "zh" ? "warning" : "warning"}</span>
    <span className={errors > 0 ? "fit-status-badge danger" : "fit-status-badge metric"}>{errors} error</span>
    {frontendFailure ? <span className="fit-status-badge danger">{t(language, "frontendSanity")}</span> : null}
  </div>;
}

export function FitDiagnostics({
  result,
  language,
  onCheckLogIv,
  onAdjustInitials,
  onClose,
}: {
  result: FitResult | null;
  language: Language;
  onCheckLogIv?: () => void;
  onAdjustInitials?: () => void;
  onClose?: () => void;
}) {
  if (!result) return null;
  const verdict = fitQualityVerdict(result, language);
  const warnings = result.warnings ?? [];
  const errors = warnings.filter((w) => w.severity === "error").length;
  const warningCount = warnings.length - errors;
  if (verdict.severity === "ok" && warnings.length === 0) return null;

  const logExcluded = result.metrics.log_points_excluded ?? 0;
  const title = language === "zh"
    ? `Diagnostics：${warningCount} warning，${errors} error`
    : `Diagnostics: ${warningCount} warning(s), ${errors} error(s)`;

  return (
    <div className={`fit-diagnostics ${errors ? "error" : verdict.severity === "warning" || warningCount ? "warning" : "neutral"}`}>
      <details>
        <summary>
          <span>{title}</span>
          {onClose ? <button className="diagnostics-close" type="button" aria-label={language === "zh" ? "关闭 diagnostics" : "Close diagnostics"} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onClose(); }}>×</button> : null}
        </summary>
        <div className="diagnostics-body">
          {verdict.severity !== "ok" ? <section>
            <strong>{verdict.title}</strong>
            <p>{verdict.message}</p>
            <p>{language === "zh" ? "Log MAE 排除近零点：" : "Log MAE near-zero exclusions:"} {Math.round(logExcluded)}</p>
          </section> : null}
          {warnings.length ? <section>
            <strong>{language === "zh" ? "Warnings" : "Warnings"}</strong>
            <ul>
              {warnings.map((w) => <li key={`${w.code}-${w.message}`} title={`${w.code}: ${w.message}`} className={w.severity}><span>{w.code}</span>: {w.message}</li>)}
            </ul>
          </section> : null}
          <div className="fit-verdict-actions">
            <button type="button" onClick={onCheckLogIv}>{language === "zh" ? "查看 Log I-V" : "Check log I-V"}</button>
            <button type="button" onClick={onAdjustInitials}>{language === "zh" ? "调整初值" : "Adjust initials"}</button>
          </div>
        </div>
      </details>
    </div>
  );
}
