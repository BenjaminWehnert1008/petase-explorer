import React from "react";
import { T } from "../theme.js";

// ScoreGauge: percentile bar used in the score dashboard for the selected variant.
export function ScoreGauge({ label, value, fmt, percentile, accent }) {
  return (
    <div style={{ flex: 1, minWidth: 150 }}>
      <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: T.slate, marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 30, color: T.ink, fontWeight: 600, lineHeight: 1, marginBottom: 8 }}>
        {fmt(value)}
      </div>
      <div style={{ height: 6, background: T.paperDim, borderRadius: 3, overflow: "hidden", position: "relative" }}>
        <div style={{ height: "100%", width: `${percentile}%`, background: accent, borderRadius: 3 }} />
      </div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10.5, color: T.slate, marginTop: 5 }}>
        {percentile !== null ? `${percentile}th percentile` : "—"}
      </div>
    </div>
  );
}
