import React from "react";
import { T } from "./theme.js";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(err) {
    return { error: err };
  }

  componentDidCatch(err, info) {
    console.error("[ErrorBoundary]", err, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: "Inter, sans-serif", background: T.paper, minHeight: "100vh", color: T.ink }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: 2, color: T.brass, textTransform: "uppercase", marginBottom: 8 }}>
            PETbusters · Variant Explorer
          </div>
          <h2 style={{ color: T.rust, fontFamily: "Fraunces, Georgia, serif", marginTop: 0 }}>Something went wrong</h2>
          <pre style={{ background: "#f4f0e8", border: `1px solid ${T.paperDim}`, borderRadius: 6, padding: 16, fontSize: 12, overflowX: "auto", color: T.ink }}>
            {String(this.state.error)}
            {"\n\n"}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ error: null })}
            style={{ marginTop: 16, border: `1px solid ${T.teal}`, background: T.teal, color: T.paper, borderRadius: 6, padding: "8px 20px", fontSize: 13, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
