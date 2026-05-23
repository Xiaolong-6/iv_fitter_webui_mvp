import React from "react";

interface Props {
  label: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(`${this.props.label} render failed`, error);
  }

  render() {
    if (this.state.error) {
      return (
        <section className="card warning error" role="alert">
          <h2>{this.props.label}</h2>
          <p>This panel failed to render. Other controls remain available.</p>
          <button onClick={() => this.setState({ error: null })}>Retry panel</button>
        </section>
      );
    }
    return this.props.children;
  }
}
