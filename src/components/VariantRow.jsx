import React from "react";
import { T } from "../theme.js";

// VariantRow: one row in the variant browser table.
export function VariantRow({ v, isSelected, isCompare, onClick, onCompareClick }) {
  return (
    <tr
      onClick={onClick}
      style={{
        cursor: "pointer",
        background: isSelected ? T.brassPale : isCompare ? T.tealPale : "transparent",
        borderBottom: `1px solid ${T.paperDim}`,
        transition: "background 120ms ease",
      }}
    >
      <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: T.ink }}>{v.id}</td>
      <td style={{ padding: "8px 10px", fontSize: 12, color: T.slate, fontFamily: "Inter, sans-serif" }}>{v.organism.split(" ")[0]}</td>
      <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: T.teal }}>{v.activity_1.toFixed(3)}</td>
      <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: T.teal }}>{v.activity_2.toFixed(3)}</td>
      <td style={{ padding: "8px 10px", fontFamily: "JetBrains Mono, monospace", fontSize: 12, textAlign: "right", color: T.rust }}>{v.expression.toFixed(3)}</td>
      <td style={{ padding: "8px 6px", textAlign: "center" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCompareClick();
          }}
          title="Set as comparison variant"
          style={{
            border: `1px solid ${isCompare ? T.teal : T.paperDim}`,
            background: isCompare ? T.teal : "transparent",
            color: isCompare ? T.paper : T.slate,
            borderRadius: 4,
            fontSize: 10,
            padding: "3px 7px",
            cursor: "pointer",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {isCompare ? "comparing" : "compare"}
        </button>
      </td>
    </tr>
  );
}
