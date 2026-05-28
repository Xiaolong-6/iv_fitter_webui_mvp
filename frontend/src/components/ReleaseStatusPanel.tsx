import { useState } from "react";
import type { Language } from "../model/i18n";
import { checkLatestRelease, type ReleaseCheckResult } from "../services/releaseCheck";
import { APP_VERSION } from "../utils/version";

const TEXT = {
  en: {
    title: "Updates",
    compactTitle: "Version and updates",
    current: "Current version",
    latest: "Latest public release",
    checked: "Last checked",
    status: "Status",
    check: "Check for updates",
    checking: "Checking...",
    open: "Open release page",
    upToDate: "Up to date",
    updateAvailable: "Update available",
    localNewer: "Local version newer than public release",
    failed: "Check failed",
    notChecked: "Not checked yet",
    noAuto: "Automatic self-update is not implemented. This checker only opens the GitHub release page.",
    assets: "Assets",
    notes: "Release notes",
    published: "Published",
    showDetails: "Show release details",
    hideDetails: "Hide release details",
    compactHelp: "The manual is local. Update checking is read-only and never blocks fitting.",
  },
  zh: {
    title: "更新",
    compactTitle: "版本与更新",
    current: "当前版本",
    latest: "最新公开 release",
    checked: "上次检查",
    status: "状态",
    check: "检查更新",
    checking: "检查中...",
    open: "打开 release 页面",
    upToDate: "已是最新",
    updateAvailable: "有新版本",
    localNewer: "本地版本高于公开 release",
    failed: "检查失败",
    notChecked: "尚未检查",
    noAuto: "当前未实现自动自更新；这里只会打开 GitHub release 页面。",
    assets: "附件",
    notes: "Release 说明",
    published: "发布时间",
    showDetails: "显示 release 详情",
    hideDetails: "隐藏 release 详情",
    compactHelp: "手册是本地内容。更新检查是只读的，不会阻塞拟合。",
  },
} as const;

function text(language: Language, key: keyof typeof TEXT.en) {
  return TEXT[language][key] ?? TEXT.en[key];
}

function statusText(result: ReleaseCheckResult | null, language: Language) {
  if (!result) return text(language, "notChecked");
  if (result.error) return text(language, "failed");
  if (result.updateAvailable) return text(language, "updateAvailable");
  if (result.versionRelation === "newer") return text(language, "localNewer");
  return text(language, "upToDate");
}

function statusClass(result: ReleaseCheckResult | null) {
  if (!result) return "neutral";
  if (result.error) return "error";
  if (result.updateAvailable) return "warning";
  if (result.versionRelation === "newer") return "neutral";
  return "ok";
}

function formatDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleString() : "—";
}

export function ReleaseStatusPanel({ language, compact = false }: { language: Language; compact?: boolean }) {
  const [result, setResult] = useState<ReleaseCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  async function handleCheck() {
    setChecking(true);
    try {
      setResult(await checkLatestRelease());
      setDetailsOpen(false);
    } finally {
      setChecking(false);
    }
  }

  const title = compact ? text(language, "compactTitle") : text(language, "title");
  const releaseNotes = result?.bodyExcerpt ? result.bodyExcerpt : "";
  const hasDetails = Boolean(result?.releaseName || result?.publishedAt || releaseNotes || result?.assetNames.length);

  return <section className={compact ? "release-status-panel compact" : "release-status-panel"} aria-label={title}>
    <div className="release-status-header">
      <h3>{title}</h3>
      <span className={`release-status-badge ${statusClass(result)}`}>{statusText(result, language)}</span>
    </div>
    <div className="release-status-grid">
      <span><strong>{text(language, "current")}</strong><b>v{APP_VERSION}</b></span>
      <span><strong>{text(language, "latest")}</strong><b>{result?.latestVersion ?? "—"}</b></span>
      {!compact ? <span><strong>{text(language, "checked")}</strong><b>{formatDate(result?.checkedAt)}</b></span> : null}
      {!compact ? <span><strong>{text(language, "status")}</strong><b>{statusText(result, language)}</b></span> : null}
    </div>
    {compact ? <p className="muted small-note">{result?.checkedAt ? `${text(language, "checked")}: ${formatDate(result.checkedAt)}` : text(language, "compactHelp")}</p> : null}
    {result?.error ? <p className="release-status-error">{result.error}</p> : null}
    {!compact && releaseNotes ? <p className="muted release-status-excerpt">{releaseNotes}</p> : null}
    {!compact && result?.assetNames.length ? <p className="muted"><strong>{text(language, "assets")}:</strong> {result.assetNames.join(", ")}</p> : null}
    {compact && hasDetails ? <details className="release-status-details" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
      <summary>{detailsOpen ? text(language, "hideDetails") : text(language, "showDetails")}</summary>
      <div className="release-status-details-body">
        {result?.releaseName ? <p><strong>{text(language, "notes")}:</strong> {result.releaseName}</p> : null}
        {result?.publishedAt ? <p><strong>{text(language, "published")}:</strong> {formatDate(result.publishedAt)}</p> : null}
        {releaseNotes ? <p>{releaseNotes}</p> : null}
        {result?.assetNames.length ? <p><strong>{text(language, "assets")}:</strong> {result.assetNames.join(", ")}</p> : null}
      </div>
    </details> : null}
    <div className="release-status-actions">
      <button type="button" onClick={handleCheck} disabled={checking}>{checking ? text(language, "checking") : text(language, "check")}</button>
      {result?.releaseUrl ? <a className="button-link" href={result.releaseUrl} target="_blank" rel="noreferrer">{text(language, "open")}</a> : null}
    </div>
    {!compact ? <p className="muted small-note">{text(language, "noAuto")}</p> : null}
  </section>;
}
