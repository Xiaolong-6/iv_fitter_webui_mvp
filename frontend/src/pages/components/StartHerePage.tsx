import type { AppView } from "../../components/WorkflowSidebar";
import type { FitResult } from "../../model/types";

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
  const steps = [
    {
      title: "Data",
      text: "Import and choose a trace.",
      view: "data" as AppView,
      status: hasSelectedTrace ? "Loaded" : "Needed",
    },
    {
      title: "Model",
      text: "Build the circuit model.",
      view: "model" as AppView,
      status: "Ready",
    },
    {
      title: "Fitting",
      text: "Run and inspect the fit.",
      view: "fitting" as AppView,
      status: isFitting ? "Running" : result ? "Done" : "Not run",
    },
    {
      title: "Report",
      text: "Review and export results.",
      view: "report" as AppView,
      status: reportAvailable ? "Available" : "Unavailable",
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
          <button type="button" className="hero-large-action" onClick={() => setActiveView("help")}>
            Open help
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
            className="minimal-workflow-card"
            key={step.title}
            onClick={() => setActiveView(step.view)}
            role="button"
            tabIndex={0}
          >
            <span className="minimal-step-index">{idx + 1}</span>
            <span className="minimal-step-status">{step.status}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
      <div className="minimal-current-state">
        <strong>Current state</strong>
        <span>Trace: {hasSelectedTrace ? "loaded" : "no trace loaded"}</span>
        <span>Model: Rs + D1 + Rsh</span>
        <span>Fit: {isFitting ? "running" : result ? "complete" : "not run"}</span>
        <span>Report: {reportAvailable ? "available" : "unavailable"}</span>
      </div>
    </section>
  );
}
