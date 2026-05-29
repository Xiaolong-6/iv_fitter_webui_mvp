import type { AppView } from "../../components/WorkflowSidebar";
import type { FitResult } from "../../model/types";

type StepTone = "done" | "active" | "ready" | "locked" | "running";

function stepIcon(tone: StepTone) {
  if (tone === "done") return "✓";
  if (tone === "running") return "…";
  if (tone === "locked") return "—";
  return "";
}

export function StartHerePage({
  setActiveView,
  hasSelectedTrace,
  result,
  isFitting,
  reportAvailable,
}: {
  setActiveView: (view: AppView) => void;
  hasSelectedTrace: boolean;
  result: FitResult | null;
  isFitting: boolean;
  reportAvailable: boolean;
}) {
  const steps: Array<{
    title: string;
    text: string;
    view: AppView;
    status: string;
    detail: string;
    tone: StepTone;
    locked?: boolean;
  }> = [
    {
      title: "Data",
      text: "Import and choose a trace.",
      view: "data",
      status: hasSelectedTrace ? "Loaded" : "Needed",
      detail: hasSelectedTrace ? "Trace is selected" : "Start here",
      tone: hasSelectedTrace ? "done" : "active",
    },
    {
      title: "Model",
      text: "Build the circuit model.",
      view: "model",
      status: "Ready",
      detail: result ? "Used for current fit" : "Default circuit available",
      tone: result ? "done" : "ready",
    },
    {
      title: "Fitting",
      text: "Run and inspect the fit.",
      view: "fitting",
      status: isFitting ? "Running" : result ? "Done" : "Not run",
      detail: isFitting ? "Solver in progress" : result ? "Fit result exists" : "Awaiting run",
      tone: isFitting ? "running" : result ? "done" : hasSelectedTrace ? "active" : "locked",
      locked: !hasSelectedTrace,
    },
    {
      title: "Report",
      text: "Review and export results.",
      view: "report",
      status: reportAvailable ? "Available" : "Unavailable",
      detail: reportAvailable ? "Export is ready" : "Needs a completed fit",
      tone: reportAvailable ? "done" : result ? "active" : "locked",
      locked: !result,
    },
  ];
  return (
    <section className="workflow-page scroll-page start-page minimal-start-page">
      <div className="minimal-hero">
        <div className="hero-kicker">Circuit-based I-V fitting</div>
        <h2>Welcome to IV-fitter</h2>
        <p>
          Import I-V data, build a model, run the fit, and export a reproducible
          report.
        </p>
        <div className="hero-actions">
          <button
            type="button"
            className="primary hero-primary hero-large-action"
            onClick={() => setActiveView("data")}
          >
            Start with data
          </button>
          <button type="button" className="hero-large-action hero-help-action" onClick={() => setActiveView("help")} aria-label="Open help and parameter guide">
            <span className="hero-help-icon" aria-hidden="true">?</span>
            <span>Help</span>
          </button>
        </div>
      </div>
      <div className="minimal-workflow-head">
        <div>
          <h3>Workflow</h3>
          <p>Four pages, one fitting path.</p>
        </div>
        <div className="workflow-mini-path">Data → Model → Fitting → Report</div>
      </div>
      <div className="minimal-workflow-grid">
        {steps.map((step, idx) => (
          <article
            className={`minimal-workflow-card step-${step.tone}${step.locked ? " is-locked" : ""}`}
            key={step.title}
            onClick={() => !step.locked && setActiveView(step.view)}
            onKeyDown={(event) => {
              if (!step.locked && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                setActiveView(step.view);
              }
            }}
            role="button"
            tabIndex={step.locked ? -1 : 0}
            aria-disabled={step.locked ? "true" : undefined}
          >
            <div className="minimal-step-topline">
              <span className="minimal-step-index">{idx + 1}</span>
              <span className="minimal-step-check" aria-hidden="true">{stepIcon(step.tone)}</span>
            </div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <div className="minimal-card-state" aria-label={`${step.title} status: ${step.status}`}>
              <span className={`minimal-step-status status-${step.tone}`}>{step.status}</span>
              <span className="minimal-step-detail">{step.detail}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
