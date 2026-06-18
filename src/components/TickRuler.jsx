import React from "react";
import { T } from "../theme.js";

// TickRuler: the recurring structural motif borrowed from sequence-position
// rulers (genome-browser style). Reused in the masthead, under distribution
// plots, and as the literal sequence-position strip — not decoration, it's
// the same device doing the same job (marking position) everywhere it shows up.
export function TickRuler({ ticks = 20, accent = false }) {
  const items = Array.from({ length: ticks });
  return (
    <div
      style={{ display: "flex", width: "100%", height: 10, alignItems: "flex-end", gap: 0 }}
      aria-hidden="true"
    >
      {items.map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: i % 5 === 0 ? 10 : 5,
            borderLeft: `1px solid ${accent ? T.brass : T.ink}`,
            opacity: i % 5 === 0 ? 0.55 : 0.22,
          }}
        />
      ))}
    </div>
  );
}
