interface Props { quality?: any; }
export function DataImportQuality({ quality }: Props) {
  if (!quality) return <div className="muted">No imported trace quality summary yet.</div>;
  return <section className="card small-card">
    <h3>Import quality</h3>
    <div>Rows imported: {quality.rows_imported} / {quality.rows_in_file}</div>
    <div>Columns: {quality.voltage_col} / {quality.current_col}</div>
    <div>V range: {quality.voltage_min_V} to {quality.voltage_max_V} V</div>
    <div>I range: {quality.current_min_A} to {quality.current_max_A} A</div>
    {(quality.warnings ?? []).map((w: string) => <div className="warning" key={w}>{w}</div>)}
  </section>;
}
