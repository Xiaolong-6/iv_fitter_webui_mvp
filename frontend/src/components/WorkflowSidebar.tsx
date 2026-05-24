import type { ReactNode } from "react";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

export type AppView = "data" | "workspace" | "usage";

const tabIds: AppView[] = ["data", "workspace", "usage"];
const tabIcons: Record<AppView, string> = { data: "D", workspace: "W", usage: "M" };

export function WorkflowSidebar({
  activeView,
  onSelect,
  version,
  collapsed,
  onToggleCollapsed,
  language,
  onLanguageChange,
  zoomControl,
}: {
  activeView: AppView;
  onSelect: (view: AppView) => void;
  version: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  language: Language;
  onLanguageChange: (language: Language) => void;
  zoomControl?: ReactNode;
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
          <span className="tab-icon" aria-hidden="true">{tabIcons[tab]}</span>
          {!collapsed && <span className="tab-label">{labelFor(tab)}</span>}
        </button>)}
      </nav>
      {!collapsed && <p className="muted sidebar-note">{language === "zh" ? "本地拟合，报告前复核。" : "Fit locally. Review before reporting."}</p>}
    </div>
    <div className="sidebar-footer">
      {!collapsed ? <label className="language-switch"><span>{t(language, "language")}</span><select value={language} onChange={(e) => onLanguageChange(e.target.value as Language)}>
        <option value="en">{t(language, "english")}</option>
        <option value="zh">{t(language, "chinese")}</option>
      </select></label> : <button className="language-icon" title={t(language, "language")} onClick={() => onLanguageChange(language === "en" ? "zh" : "en")}>{language === "en" ? "ZH" : "EN"}</button>}
      {zoomControl ? <div className="sidebar-zoom-slot">{zoomControl}</div> : null}
      <div className="sidebar-version">
        {!collapsed && <span>{t(language, "version")}</span>}
        <strong>v{version}</strong>
      </div>
    </div>
  </aside>;
}
