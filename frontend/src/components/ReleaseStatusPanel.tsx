import { useState } from "react";
import type { Language } from "../model/i18n";
import { checkLatestRelease, type ReleaseCheckResult } from "../services/releaseCheck";
import { APP_VERSION } from "../utils/version";

const TEXT = {
  en: {
    title: "Updates",
    current: "Current version",
    latest: "Latest version",
    checked: "Last checked",
    status: "Status",
    check: "Check for updates",
    checking: "Checking...",
    open: "Open release page",
    upToDate: "Up to date",
    updateAvailable: "Update available",
    failed: "Check failed",
    notChecked: "Not checked yet",
    noAuto: "Automatic self-update is not implemented. This checker only opens the GitHub release page.",
    assets: "Assets",
  },
  zh: {
    title: "更新",
    current: "当前版本",
    latest: "最新版本",
    checked: "上次检查",
    status: "状态",
    check: "检查更新",
    checking: "检查中...",
    open: "打开 release 页面",
    upToDate: "已是最新",
    updateAvailable: "有新版本",
    failed: "检查失败",
    notChecked: "尚未检查",
    noAuto: "当前未实现自动自更新；这里只会打开 GitHub release 页面。",
    assets: "附件",
  },
} as const;

function text(language: Language, key: keyof typeof TEXT.en) {
  return TEXT[language][key] ?? TEXT.en[key];
}

function statusText(result: ReleaseCheckResult | null, language: Language) {
  if (!result) return text(language, "notChecked");
  if (result.error) return text(language, "failed");
  return result.updateAvailable ? text(language, "updateAvailable") : text(language, "upToDate");
}

export function ReleaseStatusPanel({ language }: { language: Language }) {
  const [result, setResult] = useState<ReleaseCheckResult | null>(null);
  const [checking, setChecking] = useState(false);

  async function handleCheck() {
    setChecking(true);
    try {
      setResult(await checkLatestRelease());
    } finally {
      setChecking(false);
    }
  }

  return <section className="release-status-panel" aria-label={text(language, "title")}>
    <div className="release-status-header">
      <h3>{text(language, "title")}</h3>
      <span className={result?.error ? "release-status-badge error" : result?.updateAvailable ? "release-status-badge warning" : "release-status-badge ok"}>{statusText(result, language)}</span>
    </div>
    <div className="release-status-grid">
      <span><strong>{text(language, "current")}</strong><b>v{APP_VERSION}</b></span>
      <span><strong>{text(language, "latest")}</strong><b>{result?.latestVersion ?? "—"}</b></span>
      <span><strong>{text(language, "checked")}</strong><b>{result?.checkedAt ? new Date(result.checkedAt).toLocaleString() : "—"}</b></span>
      <span><strong>{text(language, "status")}</strong><b>{statusText(result, language)}</b></span>
    </div>
    {result?.error ? <p className="release-status-error">{result.error}</p> : result?.bodyExcerpt ? <p className="muted">{result.bodyExcerpt}</p> : null}
    {result?.assetNames.length ? <p className="muted"><strong>{text(language, "assets")}:</strong> {result.assetNames.join(", ")}</p> : null}
    <div className="release-status-actions">
      <button type="button" onClick={handleCheck} disabled={checking}>{checking ? text(language, "checking") : text(language, "check")}</button>
      {result?.releaseUrl ? <a className="button-link" href={result.releaseUrl} target="_blank" rel="noreferrer">{text(language, "open")}</a> : null}
    </div>
    <p className="muted small-note">{text(language, "noAuto")}</p>
  </section>;
}
