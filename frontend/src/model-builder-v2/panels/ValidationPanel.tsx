import type { ValidationResult } from "../domain/schematicTypes";

export function ValidationPanel({ validation }: { validation: ValidationResult }) {
  return (
    <section className="mbv2-validation-panel" aria-label="Graph validation">
      <div className={`mbv2-validation-status ${validation.valid ? "is-valid" : "is-warning"}`}>
        {validation.valid ? "Ready to compile" : "Needs connection"}
      </div>
      <div className="mbv2-validation-summary">
        Active components: {validation.activeComponentIds.size} · Ignored components: {validation.danglingComponentIds.size}
      </div>
      <div className="mbv2-validation-issues">
        {validation.issues.slice(0, 4).map((issue) => (
          <div key={issue.id} className={`mbv2-issue is-${issue.severity}`}>
            <strong>{issue.title}</strong>
            <span>{issue.message}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
