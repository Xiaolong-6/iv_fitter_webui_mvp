import type { ReactNode } from "react";

function IconSvg({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="page-icon-svg">{children}</svg>;
}

export const pageIcons = {
  start: <IconSvg><path d="M4 11.5 12 5l8 6.5"/><path d="M6.5 10.5V19h4v-5h3v5h4v-8.5"/></IconSvg>,
  data: <IconSvg><ellipse cx="12" cy="6" rx="6.5" ry="3"/><path d="M5.5 6v6c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3V6"/><path d="M5.5 12v6c0 1.7 2.9 3 6.5 3s6.5-1.3 6.5-3v-6"/></IconSvg>,
  model: <IconSvg><path d="M4 12h4"/><path d="M16 12h4"/><rect x="8" y="8" width="8" height="8" rx="2"/><path d="M12 4v4"/><path d="M12 16v4"/></IconSvg>,
  fitting: <IconSvg><path d="M4 19h16"/><path d="M5 17c3-7 5-2 7-8 2-5 4 7 7-1"/></IconSvg>,
  report: <IconSvg><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h4"/><path d="M10 12h6"/><path d="M10 16h6"/></IconSvg>,
  help: <IconSvg><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 0 1 4.4 1.3c0 1.8-2.2 2.1-2.2 3.7"/><path d="M12 17.5h.01"/></IconSvg>,
} as const;
