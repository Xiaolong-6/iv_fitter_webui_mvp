import { BackendConnectionBanner, isBackendConnectionError } from "./BackendConnectionBanner";
import type { Language } from "../../model/i18n";
import type { FitResult } from "../../model/types";
import { t } from "../../model/i18n";

export function FitActionButtons({
  hasSelectedTrace,
  isFitting,
  language,
  onRunFit,
  onStopFit,
}: {
  hasSelectedTrace: boolean;
  isFitting: boolean;
  language: Language;
  onRunFit: () => void;
  onStopFit: () => void;
}) {
  return (
    <>
      <button
        className={hasSelectedTrace ? "primary" : "fit-action-unavailable"}
        disabled={isFitting || !hasSelectedTrace}
        title={!hasSelectedTrace ? "Import data before running a fit." : undefined}
        onClick={onRunFit}
      >
        <span className="button-icon" aria-hidden="true">▶</span>
        {t(language, "runFit")}
      </button>
      <button className={isFitting ? "danger-soft active" : "danger-soft"} disabled={!isFitting} onClick={onStopFit}>
        <span className="button-icon" aria-hidden="true">■</span>
        {language === "zh" ? "停止拟合" : "Stop fit"}
      </button>
    </>
  );
}

function reportTone(result: FitResult | null, reportAvailable: boolean) {
  if (!result) return "idle";
  const errors = (result.warnings ?? []).filter((w) => w.severity === "error").length;
  if (reportAvailable && (result.reportable ?? result.success) && errors === 0) return "ok";
  if (errors > 0 || result.success === false) return "error";
  return "warning";
}

export function FitReportButton({
  result,
  language,
  onMakeReport,
  reportAvailable,
}: {
  result: FitResult | null;
  language: Language;
  onMakeReport: () => void;
  reportAvailable: boolean;
}) {
  const tone = reportTone(result, reportAvailable);
  const label = language === "zh" ? "生成报告" : t(language, "report");
  const hint = !result
    ? language === "zh"
      ? "完成拟合后可用。"
      : "Available after a completed fit."
    : reportAvailable
      ? language === "zh"
        ? "当前 check 允许生成报告。"
        : "Current check allows report generation."
      : language === "zh"
        ? "当前 check 未通过，报告暂不可用。"
        : "Current check has not passed; report is unavailable.";
  return (
    <div className={`report-gate-action ${tone}`}>
      <button
        type="button"
        className={`report-gate-button ${tone}`}
        disabled={!reportAvailable}
        title={hint}
        onClick={onMakeReport}
      >
        <span className="button-icon" aria-hidden="true">▣</span>
        {label}
      </button>
      <span className="report-gate-hint">{hint}</span>
    </div>
  );
}


export function FitMessages({
  hasTrace,
  error,
  isFitting,
  fitPromotionNotice,
  noTraceRunAttempted,
  onRetry,
}: {
  hasTrace: boolean;
  error: string | null;
  isFitting: boolean;
  fitPromotionNotice: string | null;
  noTraceRunAttempted: boolean;
  onRetry: () => void;
}) {
  return (
    <>
      {!hasTrace && !error ? (
        <div className="fit-primary-message empty">
          <strong>No trace loaded.</strong>
          <span>Import data or load a synthetic example before fitting.</span>
        </div>
      ) : null}
      {fitPromotionNotice ? (
        <div className="fit-primary-message warning">
          <strong>Gate failed:</strong>
          <span>fitted values were not promoted to initials.</span>
        </div>
      ) : null}
      {isFitting ? (
        <div className="fit-primary-message info">
          Fitting is running; Stop fit aborts the current request and ignores late results.
        </div>
      ) : null}
      {error ? (
        isBackendConnectionError(error) ? (
          <BackendConnectionBanner message={error} onRetry={onRetry} />
        ) : (
          <div className={noTraceRunAttempted ? "warning error validation fit-primary-message" : "warning error fit-primary-message"}>
            {error}
          </div>
        )
      ) : null}
    </>
  );
}
