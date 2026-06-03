import { BackendConnectionBanner, isBackendConnectionError } from "./BackendConnectionBanner";
import type { Language } from "../../model/i18n";
import type { FitResult } from "../../model/types";
import { t } from "../../model/i18n";

export function FitActionButtons({
  hasSelectedTrace,
  isFitting,
  result,
  language,
  onRunFit,
  onStopFit,
}: {
  hasSelectedTrace: boolean;
  isFitting: boolean;
  result: FitResult | null;
  language: Language;
  onRunFit: () => void;
  onStopFit: () => void;
}) {
  const completed = !!result && !isFitting;
  const canRun = hasSelectedTrace && !isFitting;

  let label: string;
  let icon: string;
  let className: string;
  let title: string | undefined;

  if (isFitting) {
    label = language === "zh" ? "停止拟合" : "Stop fit";
    icon = "■";
    className = "primary fit-action-stop";
    title = language === "zh" ? "中断当前拟合" : "Abort the running fit";
  } else if (completed) {
    label = language === "zh" ? "重新拟合" : "Run again";
    icon = "▶";
    className = "primary";
    title = undefined;
  } else {
    label = t(language, "runFit");
    icon = "▶";
    className = hasSelectedTrace ? "primary" : "fit-action-unavailable";
    title = !hasSelectedTrace ? (language === "zh" ? "请先导入数据" : "Import data before running a fit.") : undefined;
  }

  return (
    <button
      className={className}
      disabled={!canRun && !isFitting}
      title={title}
      onClick={isFitting ? onStopFit : onRunFit}
    >
      <span className="button-icon" aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
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
  const label = language === "zh" ? "报告 →" : "Report →";
  const hint = !result
    ? (language === "zh" ? "完成拟合后可用" : "Available after fit")
    : reportAvailable
      ? (language === "zh" ? "查看报告" : "View report")
      : (language === "zh" ? "报告暂不可用" : "Report unavailable");

  return (
    <button
      type="button"
      className={`fit-report-inline ${reportAvailable ? "available" : "locked"}`}
      disabled={!reportAvailable}
      title={hint}
      onClick={onMakeReport}
    >
      {label}
    </button>
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
