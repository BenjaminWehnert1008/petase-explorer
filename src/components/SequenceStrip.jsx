import React, { useRef, useEffect } from "react";
import { T } from "../theme.js";

const CHAR_W = 9; // px per character cell

const AA3TO1 = {
  ALA:"A",ARG:"R",ASN:"N",ASP:"D",CYS:"C",GLN:"Q",GLU:"E",
  GLY:"G",HIS:"H",ILE:"I",LEU:"L",LYS:"K",MET:"M",PHE:"F",
  PRO:"P",SER:"S",THR:"T",TRP:"W",TYR:"Y",VAL:"V",
};
export function resn3to1(resn) {
  return AA3TO1[resn?.toUpperCase()] ?? "?";
}

export function SequenceStrip({ sequence, catS, catD, catH, selectedResidue, onResidueSelect }) {
  const catSet = new Set([catS, catD, catH].filter((v) => v != null));
  const scrollRef = useRef(null);

  // Auto-scroll to keep selected residue visible
  useEffect(() => {
    if (!scrollRef.current || !selectedResidue?.resi) return;
    const pos = selectedResidue.resi - 1;
    const targetX = pos * CHAR_W - scrollRef.current.clientWidth / 2;
    scrollRef.current.scrollTo({ left: Math.max(0, targetX), behavior: "smooth" });
  }, [selectedResidue]);

  return (
    <div ref={scrollRef} style={{ overflowX: "auto", padding: "6px 16px 10px", WebkitOverflowScrolling: "touch" }}>
      <div style={{ display: "inline-block", position: "relative" }}>
        {/* Position markers */}
        <div style={{ position: "relative", height: 14, marginBottom: 2 }}>
          {sequence.split("").map((_, i) => {
            const pos = i + 1;
            if (pos !== 1 && pos % 10 !== 0) return null;
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: (i + 0.5) * CHAR_W,
                  transform: "translateX(-50%)",
                  fontSize: 8,
                  fontFamily: "JetBrains Mono, monospace",
                  color: T.brass,
                  userSelect: "none",
                  lineHeight: "14px",
                  whiteSpace: "nowrap",
                }}
              >
                {pos}
              </span>
            );
          })}
        </div>

        {/* Sequence characters */}
        <div style={{ display: "flex" }}>
          {sequence.split("").map((aa, i) => {
            const pos = i + 1;
            const isCat = catSet.has(pos);
            const isSelected = selectedResidue?.resi === pos;
            return (
              <span
                key={i}
                title={`${aa}${pos}`}
                onClick={() => onResidueSelect(isSelected ? null : { resi: pos, resn: aa })}
                style={{
                  width: CHAR_W,
                  flexShrink: 0,
                  textAlign: "center",
                  cursor: "pointer",
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: 11,
                  lineHeight: "16px",
                  color: isSelected ? T.ink : isCat ? T.brass : T.paper,
                  background: isSelected
                    ? T.paper
                    : isCat
                    ? "rgba(201,162,39,0.3)"
                    : "transparent",
                  borderRadius: 2,
                  fontWeight: isCat ? 700 : 400,
                  userSelect: "none",
                  transition: "background 80ms ease, color 80ms ease",
                  outline: isSelected ? `1px solid ${T.paper}` : "none",
                }}
              >
                {aa}
              </span>
            );
          })}
        </div>

        {/* Legend */}
        {catSet.size > 0 && (
          <div style={{ marginTop: 5, fontSize: 9, color: T.slate, fontFamily: "Inter, sans-serif", display: "flex", gap: 10 }}>
            <span style={{ color: T.brass }}>■</span> catalytic triad
            {selectedResidue && (
              <span style={{ color: T.paper, marginLeft: 8 }}>
                selected: {selectedResidue.resn}{selectedResidue.resi}
              </span>
            )}
          </div>
        )}
        {catSet.size === 0 && selectedResidue && (
          <div style={{ marginTop: 5, fontSize: 9, color: T.slate, fontFamily: "Inter, sans-serif" }}>
            <span style={{ color: T.paper }}>selected: {selectedResidue.resn}{selectedResidue.resi}</span>
          </div>
        )}
      </div>
    </div>
  );
}
