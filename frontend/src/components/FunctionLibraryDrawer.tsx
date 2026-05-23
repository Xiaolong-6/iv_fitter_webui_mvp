import type { FunctionDefinition } from "../model/types";

interface Props { registry: FunctionDefinition[]; onClose?: () => void; }

export function FunctionLibraryDrawer({ registry, onClose }: Props) {
  const byLocation = registry.reduce<Record<string, FunctionDefinition[]>>((acc, item) => {
    (acc[item.location] ||= []).push(item);
    return acc;
  }, {});
  return <aside className="drawer">
    <div className="drawer-head"><h2>Function library</h2>{onClose && <button onClick={onClose}>Close</button>}</div>
    <p className="muted">Each function declares topology, allowed polarity, parameters, equation, and physical role from the backend registry.</p>
    {Object.entries(byLocation).map(([location, items]) => <section key={location}>
      <h3>{location}</h3>
      {items.map((item) => <article className="function-card" key={`${item.location}-${item.function_type}`}>
        <strong>{item.display_name}</strong>
        <div className="muted">{item.function_type} · allowed: {(item.allowed_polarities ?? []).join(", ") || "n/a"}</div>
        <code>{item.equation_template}</code>
        <p>{item.help_text}</p>
      </article>)}
    </section>)}
  </aside>;
}
