import type { FitResult, FitSessionStats } from "../model/types";
import { fmtEng } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { currentDataScale, fitQualityVerdict } from "../model/diagnostics";

type FitLifecycleStatus =
  | { kind: "idle" }
  | { kind: "running"; runId: number; startedAt: number; timeoutS: number }
  | { kind: "cancelled"; runId: number; elapsedSeconds: number }
  | { kind: "timeout"; runId: number; timeoutS: number }
  | { kind: "error"; runId?: number; message: string };

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
  if (finiteFit.length !== fit.length || finiteMeas.length !== meas.length)
    return "non-finite current values";

  const absMeas = finiteMeas.map((v) => Math.abs(v)).sort((a, b) => a - b);
  const measScale = Math.max(
    Math.max(...absMeas, 0),
    percentile(absMeas, 0.95),
    1e-15,
  );
  const maxFit = Math.max(...finiteFit.map((v) => Math.abs(v)), 0);
  const finiteResidual = residual.filter(Number.isFinite);
  const maxResidual = Math.max(...finiteResidual.map((v) => Math.abs(v)), 0);
  const rmse = result.metrics.linear_rmse_A;
  const absoluteLimit = 1e3;
  const relativeFitLimit = 1e8 * measScale;
  const relativeRmseLimit = 1e7 * measScale;

  if (maxFit > Math.max(absoluteLimit, relativeFitLimit))
    return "fit current explosion";
  if (maxResidual > Math.max(absoluteLimit, relativeFitLimit))
    return "residual explosion";
  if (!Number.isFinite(rmse)) return "non-finite RMSE";
  if (rmse > Math.max(absoluteLimit, relativeRmseLimit))
    return "RMSE explosion";
  return null;
}

function fmtNumber(value: number | null | undefined, digits = 3) {
  if (value === null || value === undefined || !Number.isFinite(value))
    return "—";
  const abs = Math.abs(value);
  if (abs !== 0 && (abs < 1e-3 || abs >= 1e4))
    return value.toExponential(digits);
  return Number(value.toPrecision(digits + 1)).toString();
}

function fmtMetric(value: number | null | undefined, unit = "") {
  const text = fmtNumber(value, 3);
  return unit && text !== "—" ? `${text} ${unit}` : text;
}

export function FitStatusBar({
  result,
  language,
  isFitting = false,
  elapsedSeconds = 0,
  lifecycleStatus = { kind: "idle" },
}: {
  result: FitResult | null;
  language: Language;
  isFitting?: boolean;
  elapsedSeconds?: number;
  lifecycleStatus?: FitLifecycleStatus;
}) {
  if (isFitting)
    return (
      <div
        className="fit-status-compact running"
        title={language === "zh" ? "拟合正在运行" : "Fit is running"}
      >
        <span className="fit-status-dot" aria-hidden="true" />
        <span className="fit-status-text">
          {language === "zh"
            ? `运行中 · ${elapsedSeconds}s`
            : `Running · ${elapsedSeconds}s elapsed`}
        </span>
      </div>
    );

  if (!result) {
    if (lifecycleStatus.kind === "cancelled")
      return (
        <div
          className="fit-status-compact warning"
          title={
            language === "zh"
              ? "当前拟合已停止，迟到结果会被忽略"
              : "The current fit was stopped; late results will be ignored"
          }
        >
          <span className="fit-status-dot" aria-hidden="true" />
          <span className="fit-status-text">
            {language === "zh"
              ? `已停止 · ${lifecycleStatus.elapsedSeconds}s`
              : `Cancelled · ${lifecycleStatus.elapsedSeconds}s elapsed`}
          </span>
        </div>
      );
    if (lifecycleStatus.kind === "timeout")
      return (
        <div
          className="fit-status-compact error"
          title={
            language === "zh"
              ? "拟合超时，迟到结果会被忽略"
              : "Fit timed out; late results will be ignored"
          }
        >
          <span className="fit-status-dot" aria-hidden="true" />
          <span className="fit-status-text">
            {language === "zh"
              ? `超时 · ${lifecycleStatus.timeoutS}s`
              : `Timeout · exceeded ${lifecycleStatus.timeoutS}s`}
          </span>
        </div>
      );
    if (lifecycleStatus.kind === "error")
      return (
        <div
          className="fit-status-compact error"
          title={lifecycleStatus.message}
        >
          <span className="fit-status-dot" aria-hidden="true" />
          <span className="fit-status-text">
            {language === "zh"
              ? "错误 · 未生成结果"
              : "Error · no result generated"}
          </span>
        </div>
      );
    return (
      <div
        className="fit-status-compact idle"
        title={t(language, "readyNoFit")}
      >
        <span className="fit-status-dot" aria-hidden="true" />
        <span className="fit-status-text">{t(language, "readyNoFit")}</span>
      </div>
    );
  }

  const backendWarn = result.warnings.filter(
    (w) => w.severity !== "error",
  ).length;
  const backendErrors = result.warnings.filter(
    (w) => w.severity === "error",
  ).length;
  const frontendFailure = frontendQualityFailure(result);
  const errors = backendErrors + (frontendFailure ? 1 : 0);
  const rmse = result.metrics.linear_rmse_A;
  const passed =
    (result.reportable ?? result.success) && result.success && errors === 0;
  const title = result.reportability_reason ?? result.message;
  const scale = currentDataScale(result.curves.current_measured_A);
  const rmseRatio =
    Number.isFinite(rmse) && scale > 0 ? rmse / scale : Infinity;
  const warningText =
    backendWarn === 1 ? "1 warning" : `${backendWarn} warnings`;
  const errorText = errors === 1 ? "1 error" : `${errors} errors`;
  const zhWarningText = `${backendWarn} warning`;
  const zhErrorText = `${errors} error`;
  const tone = errors > 0 ? "error" : passed ? "ok" : "warning";
  const statusText =
    language === "zh"
      ? [
          passed
            ? "已收敛"
            : result.success
              ? "已收敛，门控未通过"
              : "拟合失败",
          `RMSE ${fmtEng(rmse, 4)} A`,
          zhWarningText,
          errors ? zhErrorText : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          passed
            ? "Converged"
            : result.success
              ? "Converged, gate failed"
              : "Fit failed",
          `RMSE ${fmtEng(rmse, 4)} A`,
          `${fmtEng(rmseRatio, 3)}× scale`,
          backendWarn ? warningText : "0 warnings",
          errors ? errorText : null,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className={`fit-status-compact ${tone}`} title={title}>
      <span className="fit-status-dot" aria-hidden="true" />
      <span className="fit-status-text">{statusText}</span>
    </div>
  );
}

export function FitProcessDiagnostics({
  result,
  language,
  sessionStats,
}: {
  result: FitResult | null;
  language: Language;
  sessionStats: FitSessionStats;
}) {
  if (!result) return null;
  const d = result.fit_diagnostics;
  const m = result.metrics ?? {};
  const r2 = m.linear_r2;
  const logR2 = m.log_magnitude_r2;
  const reducedChi = m.reduced_chi_square;
  const nfev = d?.function_evaluations ?? null;
  const elapsed = d?.elapsed_s ?? null;
  const points = d
    ? `${d.points_used}/${d.points_in_selected_range || d.points_total}`
    : "—";
  const title =
    language === "zh"
      ? "拟合过程与质量指标"
      : "Fit process and quality metrics";
  const chiLabel =
    language === "zh" ? "加权 reduced χ²" : "weighted reduced χ²";
  const chiHelp =
    language === "zh"
      ? "这里的 reduced χ² 使用当前 residual weighting 计算。只有当权重是真实测量不确定度时，它才有严格统计意义；否则主要是残差尺度诊断。"
      : "This reduced χ² is computed from the active weighted residuals. It is strictly statistical only when weights are true measurement uncertainties; otherwise it is a residual-scale diagnostic.";

  return (
    <div className="fit-process-diagnostics" title={chiHelp}>
      <details>
        <summary>
          <span>{title}</span>
          <span className="fit-process-summary">
            {language === "zh" ? "点" : "pts"} {points}
          </span>
          <span className="fit-process-summary">
            evals {fmtNumber(nfev, 0)}
          </span>
          <span className="fit-process-summary">R² {fmtNumber(r2, 4)}</span>
          <span className="fit-process-summary">
            χ²ν {fmtNumber(reducedChi, 3)}
          </span>
        </summary>
        <div className="fit-process-body">
          <section>
            <strong>
              {language === "zh" ? "质量指标" : "Quality metrics"}
            </strong>
            <div className="fit-process-grid">
              <span>RMSE</span>
              <b>{fmtMetric(m.linear_rmse_A, "A")}</b>
              <span>
                {language === "zh" ? "归一化 RMSE" : "Normalized RMSE"}
              </span>
              <b>{fmtNumber(m.normalized_rmse, 4)}</b>
              <span>{language === "zh" ? "线性 R²" : "Linear R²"}</span>
              <b>{fmtNumber(r2, 5)}</b>
              <span>
                {language === "zh" ? "log-magnitude R²" : "Log-magnitude R²"}
              </span>
              <b>{fmtNumber(logR2, 5)}</b>
              <span>{language === "zh" ? "log MAE" : "Log MAE"}</span>
              <b>{fmtMetric(m.log_magnitude_mae_decades, "dec")}</b>
              <span title={chiHelp}>{chiLabel}</span>
              <b title={chiHelp}>{fmtNumber(reducedChi, 4)}</b>
            </div>
          </section>
          <section>
            <strong>
              {language === "zh" ? "求解器过程" : "Solver process"}
            </strong>
            <div className="fit-process-grid">
              <span>{language === "zh" ? "本次耗时" : "Elapsed"}</span>
              <b>{fmtMetric(elapsed, "s")}</b>
              <span>{language === "zh" ? "函数评估" : "Function evals"}</span>
              <b>{fmtNumber(nfev, 0)}</b>
              <span>
                {language === "zh" ? "Jacobian 评估" : "Jacobian evals"}
              </span>
              <b>{fmtNumber(d?.jacobian_evaluations, 0)}</b>
              <span>{language === "zh" ? "自由参数" : "Free parameters"}</span>
              <b>{fmtNumber(d?.free_parameter_count, 0)}</b>
              <span>{language === "zh" ? "自由度" : "DoF"}</span>
              <b>{fmtNumber(d?.degrees_of_freedom, 0)}</b>
              <span>{language === "zh" ? "优化状态" : "Optimizer status"}</span>
              <b>{d?.optimizer_status ?? "—"}</b>
              <span>{language === "zh" ? "Cost" : "Cost"}</span>
              <b>{fmtNumber(d?.cost, 4)}</b>
              <span>{language === "zh" ? "Optimality" : "Optimality"}</span>
              <b>{fmtNumber(d?.optimality, 4)}</b>
            </div>
            {d?.active_bounds?.length ? (
              <p className="fit-process-note">
                <strong>
                  {language === "zh" ? "活跃边界：" : "Active bounds: "}
                </strong>
                {d.active_bounds.join(", ")}
              </p>
            ) : null}
            {d?.optimizer_message ? (
              <p className="fit-process-note">
                <strong>
                  {language === "zh" ? "求解器消息：" : "Solver message: "}
                </strong>
                {d.optimizer_message}
              </p>
            ) : null}
          </section>
          <section>
            <strong>{language === "zh" ? "本次会话" : "This session"}</strong>
            <div className="fit-process-grid compact">
              <span>{language === "zh" ? "已运行拟合" : "Fits run"}</span>
              <b>{sessionStats.fitsRun}</b>
              <span>{language === "zh" ? "总函数评估" : "Total evals"}</span>
              <b>{sessionStats.totalFunctionEvaluations}</b>
              <span>{language === "zh" ? "总拟合耗时" : "Total fit time"}</span>
              <b>{fmtMetric(sessionStats.totalElapsedS, "s")}</b>
              <span>
                {language === "zh"
                  ? "root-solver failures"
                  : "Root-solver failures"}
              </span>
              <b>{sessionStats.totalRootSolverFailures}</b>
            </div>
          </section>
        </div>
      </details>
    </div>
  );
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
  const title =
    language === "zh"
      ? `Diagnostics：${warningCount} warning，${errors} error`
      : `Diagnostics: ${warningCount} warning(s), ${errors} error(s)`;

  return (
    <div
      className={`fit-diagnostics ${errors ? "error" : verdict.severity === "warning" || warningCount ? "warning" : "neutral"}`}
    >
      <details>
        <summary>
          <span>{title}</span>
          {onClose ? (
            <button
              className="diagnostics-close"
              type="button"
              aria-label={
                language === "zh" ? "关闭 diagnostics" : "Close diagnostics"
              }
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              }}
            >
              ×
            </button>
          ) : null}
        </summary>
        <div className="diagnostics-body">
          {verdict.severity !== "ok" ? (
            <section>
              <strong>{verdict.title}</strong>
              <p>{verdict.message}</p>
              <p>
                {language === "zh"
                  ? "Log MAE 排除近零点："
                  : "Log MAE near-zero exclusions:"}{" "}
                {Math.round(logExcluded)}
              </p>
            </section>
          ) : null}
          {warnings.length ? (
            <section>
              <strong>{language === "zh" ? "Warnings" : "Warnings"}</strong>
              <ul>
                {warnings.map((w) => (
                  <li
                    key={`${w.code}-${w.message}`}
                    title={`${w.code}: ${w.message}`}
                    className={w.severity}
                  >
                    <span>{w.code}</span>: {w.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="fit-verdict-actions">
            <button type="button" onClick={onCheckLogIv}>
              {language === "zh" ? "查看 Log I-V" : "Check log I-V"}
            </button>
            <button type="button" onClick={onAdjustInitials}>
              {language === "zh" ? "调整初值" : "Adjust initials"}
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
