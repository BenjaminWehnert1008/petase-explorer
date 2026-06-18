import React from "react";
import { TickRuler } from "./TickRuler.jsx";

// SequenceStrip: the sequence display, paired directly with the tick-ruler
// position marker beneath it.
export function SequenceStrip({ sequence }) {
  const display = sequence.length > 70 ? sequence.slice(0, 70) + "…" : sequence;
  return (
    <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5 }}>
      <div style={{ color: "#F7F5EF", letterSpacing: 1.5, wordBreak: "break-all", marginBottom: 3 }}>{display}</div>
      <TickRuler ticks={35} accent />
    </div>
  );
}
