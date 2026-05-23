import type { FitResult } from "../model/types";
import { fmtBounds, fmtEng } from "../model/format";
import type { Language } from "../model/i18n";
import { t } from "../model/i18n";
import { parameterMeaning } from "../model/diagnostics";

function labelForParameter(result: FitResult, key: string) {
  const [componentId, paramName] = key.split(".");
  const components = [...result.model.core, ...result.model.series, ...result.model.parallel];
  const comp = components.find((c) => c.id === componentId);
  if (!comp) return key;
  const nick = String(comp.metadata?.nickname ?? comp.id);
  const param = comp.params[paramName];
  return `${nick}.${param?.label ?? paramName}`;
}

export function ParameterTable({ result, language }: { result: FitResult | null; language: Language }) {
  const rows = result ? Object.entries(result.parameters) : [];
  return <section className="card parameter-card">
    <h2>{t(language, "parameters")}</h2>
    {rows.length === 0 ? <p className="muted">{t(language, "runFitForParameters")}</p> : <div className="table-wrap"><table className="parameter-table">
      <thead><tr>
        <th>{t(language, "parameter")}</th>
        <th>{t(language, "value")}</th>
        <th>{t(language, "stdErr")}</th>
        <th>{t(language, "bounds")}</th>
        <th>{t(language, "state")}</th>
        <th>{language === "zh" ? "这个参数在说什么" : "What it is telling you"}</th>
      </tr></thead>
      <tbody>{rows.map(([k, p]) => <tr key={k}>
        <td title={k}>{result ? labelForParameter(result, k) : k}</td>
        <td title={String(p.value)}>{fmtEng(p.value, 5)} {p.unit ?? ""}</td>
        <td title={p.stderr === null || p.stderr === undefined ? "" : String(p.stderr)}>{p.stderr === null || p.stderr === undefined ? "-" : fmtEng(p.stderr, 3)}</td>
        <td title={`${p.lower ?? "-inf"} to ${p.upper ?? "+inf"}`}>{fmtBounds(p.lower, p.upper)}</td>
        <td>{p.fixed ? t(language, "fixed") : t(language, "fitState")}</td>
        <td className="parameter-meaning">{result ? parameterMeaning(result, k, language) : ""}</td>
      </tr>)}</tbody>
    </table></div>}
  </section>;
}
