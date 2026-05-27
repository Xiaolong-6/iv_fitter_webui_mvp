import type { ReactNode } from "react";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";

export type AppView = "start" | "data" | "model" | "fitting" | "report" | "help";

const tabIds: AppView[] = ["start", "data", "model", "fitting", "report", "help"];

type IconProps = { view: AppView };
function TabIcon({ view }: IconProps) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "tab-svg-icon",
    "aria-hidden": true,
  };
  if (view === "start") return <svg {...common}><path d="M4 11.5 12 4l8 7.5" /><path d="M6.5 10.5V20h11v-9.5" /><path d="M9.5 20v-5h5v5" /></svg>;
  if (view === "data") return <svg {...common}><path d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Z" /><path d="M5 7v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7" /><path d="M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>;
  if (view === "model") return <svg {...common}><path d="M4 12h4" /><path d="M16 12h4" /><rect x="8" y="8" width="8" height="8" rx="2" /><path d="M12 4v4" /><path d="M12 16v4" /><path d="M5 6l3 3" /><path d="M19 18l-3-3" /></svg>;
  if (view === "fitting") return <svg {...common}><path d="M4 19h16" /><path d="M5 16c2.8-.2 4.2-2.1 5.8-5.6C12 7.8 13 6 14.4 6c1.7 0 2.6 2.3 4.6 7.5" /><path d="M6 6v12" /></svg>;
  if (view === "report") return <svg {...common}><path d="M7 3.5h7l3 3V20.5H7z" /><path d="M14 3.5V7h3.5" /><path d="M9.5 11h5" /><path d="M9.5 14h5" /><path d="M9.5 17h3" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.7 9a2.4 2.4 0 0 1 4.5 1.2c0 1.8-2.2 2-2.2 3.5" /><path d="M12 17h.01" /></svg>;
}

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
          <span className="tab-icon" aria-hidden="true"><TabIcon view={tab} /></span>
          {!collapsed && <span className="tab-label">{labelFor(tab)}</span>}
        </button>)}
      </nav>
      {!collapsed && <p className="muted sidebar-note">{t(language, "startHint")}</p>}
    </div>
    <div className="sidebar-footer">
      {!collapsed && <button className="language-toggle" title={t(language, "language")} onClick={() => onLanguageChange(language === "en" ? "zh" : "en")}>{language === "en" ? "ZH" : "EN"}</button>}
      {zoomControl ? <div className="sidebar-zoom-slot">{zoomControl}</div> : null}
      <div className="sidebar-version">
        {!collapsed && <span>{t(language, "version")}</span>}
        <strong>v{version}</strong>
      </div>
      {!collapsed && <a
        className="sidebar-release-link"
        href="https://github.com/Xiaolong-6/iv_fitter_webui_mvp/releases"
        target="_blank"
        rel="noreferrer"
      >
        {language === "zh" ? "查看最新版本" : "Check newest version"}
      </a>}
    </div>
  </aside>;
}
