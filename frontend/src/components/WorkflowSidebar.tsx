import type { ReactNode } from "react";
import { pageIcons } from "../theme/pageIcons";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

export type AppView = "start" | "data" | "model" | "fitting" | "report" | "help";

const tabIds: AppView[] = ["start", "data", "model", "fitting", "report", "help"];

export function WorkflowSidebar({
  activeView,
  onSelect,
  version,
  collapsed,
  onToggleCollapsed,
  language,
  onLanguageChange,
  zoomControl,
  updateAvailable = false,
  latestVersion,
  onVersionClick,
  onReleaseClick,
}: {
  activeView: AppView;
  onSelect: (view: AppView) => void;
  version: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  zoomControl?: ReactNode;
  updateAvailable?: boolean;
  latestVersion?: string | null;
  onVersionClick?: () => void;
  onReleaseClick?: () => void;
}) {
  function labelFor(tab: AppView) {
    return t(language, tab);
  }
  function hintFor(tab: AppView) {
    return t(language, `${tab}Hint` as Parameters<typeof t>[1]);
  }
  return <aside className={collapsed ? "sidebar collapsed" : "sidebar"}>
    <div className="sidebar-main">
      <div className="sidebar-title-row">
        {!collapsed && <h1>IV-fitter Web</h1>}
        <button className="hamburger" onClick={onToggleCollapsed} aria-label={collapsed ? "Show navigation" : "Hide navigation"} title={collapsed ? "Show navigation" : "Hide navigation"}>
          <span></span><span></span><span></span>
        </button>
      </div>
      <nav className="side-tabs" aria-label="Main views">
        {tabIds.map((tab) => <button
          key={tab}
          className={activeView === tab ? "side-tab active" : "side-tab"}
          onClick={() => onSelect(tab)}
          title={hintFor(tab)}
        >
          <span className="tab-icon" aria-hidden="true">{pageIcons[tab]}</span>
          {!collapsed && <span className="tab-label">{labelFor(tab)}</span>}
        </button>)}
      </nav>
      {!collapsed && <p className="muted sidebar-note">{language === "zh" ? "本地拟合，报告前复核。" : "Fit locally. Review before reporting."}</p>}
    </div>
    <div className="sidebar-footer">
      {!collapsed ? <label className="language-switch sidebar-control"><span>{t(language, "language")}</span><select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}>
        <option value="en">{t(language, "english")}</option>
        <option value="zh">{t(language, "chinese")}</option>
      </select></label> : <button className="language-icon" title={t(language, "language")} onClick={() => onLanguageChange(language === "en" ? "zh" : "en")}>{language === "en" ? "ZH" : "EN"}</button>}
      {zoomControl ? <div className="sidebar-zoom-slot">{zoomControl}</div> : null}
      <div className={updateAvailable ? "sidebar-version has-update" : "sidebar-version"}>
        {!collapsed && <span>{t(language, "version")}</span>}
        <button
          type="button"
          className="sidebar-version-button"
          onClick={onVersionClick}
          title={
            language === "zh"
              ? "点击模拟有新版本提示，用于测试 NEW 入口"
              : "Click to simulate an available update and test the NEW entry"
          }
        >
          v{version}
        </button>
        {updateAvailable ? <button
          type="button"
          className="sidebar-new-button"
          onClick={onReleaseClick}
          title={latestVersion ? `${language === "zh" ? "打开最新 release" : "Open latest release"}: ${latestVersion}` : language === "zh" ? "打开 release 页面" : "Open release page"}
        >
          NEW
        </button> : null}
      </div>
    </div>
  </aside>;
}
