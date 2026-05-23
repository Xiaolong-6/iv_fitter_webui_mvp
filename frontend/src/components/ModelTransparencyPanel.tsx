import type { ModelSpec } from "../model/types";

export function ModelTransparencyPanel({ model }: { model: ModelSpec }) {
  const rows = [
    ["Core", model.core.length],
    ["Series", model.series.length],
    ["Parallel", model.parallel.length],
    ["Temperature", `${model.temperature_K} K`],
  ];
  const customCount = [...model.core, ...model.series, ...model.parallel].filter((c) => c.function_type === "custom").length;
  return <section className="card small-card">
    <h3>Model transparency</h3>
    {rows.map(([k, v]) => <div key={k}><strong>{k}:</strong> {v}</div>)}
    {customCount > 0 && <div className="warning">Custom fitted component(s): {customCount}. Expression and parameters will be included in exported results.</div>}
  </section>;
}
