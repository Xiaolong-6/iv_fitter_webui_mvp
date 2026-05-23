import type { FitResult } from "../model/types";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
export function WarningsPanel({ result, language }: { result: FitResult | null; language: Language }) {
  const warnings = result?.warnings ?? [];
  return <section className="card"><h2>{t(language, "warnings")}</h2>{warnings.length === 0 ? <p className="muted">{t(language, "noWarnings")}</p> : warnings.map((w) => <div className={`warning ${w.severity}`} key={w.code}><strong>{w.code}</strong>: {w.message}</div>)}</section>;
}
