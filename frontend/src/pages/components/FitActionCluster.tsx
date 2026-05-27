import { BackendConnectionBanner, isBackendConnectionError } from "./BackendConnectionBanner";
import type { Language } from "../../model/i18n";
import { t } from "../../model/i18n";

export function FitActionButtons({
  hasSelectedTrace,
  isFitting,
  language,
  onRunFit,
  onStopFit,
  onMakeReport,
  reportAvailable,
}: {
  hasSelectedTrace: boolean;
  isFitting: boolean;
  language: Language;
  onRunFit: () => void;
  onStopFit: () => void;
  onMakeReport: () => void;
  reportAvailable: boolean;
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
      <button disabled={!reportAvailable} title={!reportAvailable ? "Available after a completed fit." : undefined} onClick={onMakeReport}>
        <span className="button-icon" aria-hidden="true">▣</span>
        {t(language, "report")}
      </button>
    </>
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
