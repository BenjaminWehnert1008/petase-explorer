import React, { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import { useInjectedScript } from "../utils.js";
import { fetchPdbText } from "../useVariantData.js";
import { resn3to1 } from "./SequenceStrip.jsx";

// ── Color utilities ──────────────────────────────────────────────────────────

// Kyte-Doolittle hydrophobicity scale
const KD = {
  ALA: 1.8, ARG: -4.5, ASN: -3.5, ASP: -3.5, CYS: 2.5, GLN: -3.5, GLU: -3.5,
  GLY: -0.4, HIS: -3.2, ILE: 4.5, LEU: 3.8, LYS: -3.9, MET: 1.9, PHE: 2.8,
  PRO: -1.6, SER: -0.8, THR: -0.7, TRP: -0.9, TYR: -1.3, VAL: 4.2,
};

const AA1TO3 = {
  A:"ALA",R:"ARG",N:"ASN",D:"ASP",C:"CYS",Q:"GLN",E:"GLU",G:"GLY",
  H:"HIS",I:"ILE",L:"LEU",K:"LYS",M:"MET",F:"PHE",P:"PRO",S:"SER",
  T:"THR",W:"TRP",Y:"TYR",V:"VAL",
};

function kdColor(resn) {
  const score = KD[resn] ?? 0; // -4.5 … 4.5
  const t = (score + 4.5) / 9; // 0 = hydrophilic, 1 = hydrophobic
  const r = Math.round(30 + 200 * t);
  const g = Math.round(60 * (1 - Math.abs(2 * t - 1)));
  const b = Math.round(30 + 200 * (1 - t));
  return `rgb(${r},${g},${b})`;
}

// Per-residue electrostatic charge color (from sequence single-letter code)
const CHARGE_COLOR = {
  D: "#e05c5c", E: "#e05c5c",  // negative (red)
  K: "#5c9be0", R: "#5c9be0",  // positive (blue)
  H: "#9bc0e0",                 // weakly basic (light blue)
};
function chargeColor(aa) {
  return CHARGE_COLOR[aa] || "#aaaaaa";
}

// Per-residue aggregation propensity color from sap_arr (SAP×10 integers)
// gray (#aaa) → orange → red as SAP increases
function sapColor(val) {
  const t = Math.min(1, val / 80); // normalize: SAP=8 → t=1
  const r = Math.round(170 + 70 * t);
  const g = Math.round(170 - 80 * t);
  const b = Math.round(170 - 130 * t);
  return `rgb(${r},${g},${b})`;
}

// ── Button style helper ───────────────────────────────────────────────────────

function ctrlBtn(active, disabled) {
  return {
    border: `1px solid ${active ? T.brass : disabled ? "rgba(247,245,239,0.12)" : "rgba(247,245,239,0.25)"}`,
    background: active ? "rgba(201,162,39,0.22)" : "transparent",
    color: active ? T.brass : disabled ? "rgba(247,245,239,0.3)" : T.paper,
    borderRadius: 4,
    padding: "3px 9px",
    fontSize: 10.5,
    cursor: disabled ? "default" : "pointer",
    fontFamily: "Inter, sans-serif",
    whiteSpace: "nowrap",
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StructureViewer({ variant, selectedResidue, onResidueSelect }) {
  const ready = useInjectedScript("https://3Dmol.org/build/3Dmol-min.js", () => !!window.$3Dmol);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const onResidueSelectRef = useRef(onResidueSelect);

  const [pdbText, setPdbText] = useState(null);
  const [loadError, setLoadError] = useState(null);

  // Representation controls
  const [viewStyle, setViewStyle] = useState("cartoon");
  const [showSideChains, setShowSideChains] = useState(false);

  // Coloring mode: null = default teal, "triad" | "hydrophob" | "charge" | "agg"
  const [colorMode, setColorMode] = useState(null);

  const [hovered, setHovered] = useState(null);

  // Keep callback ref fresh
  useEffect(() => { onResidueSelectRef.current = onResidueSelect; }, [onResidueSelect]);

  // ── Fetch PDB ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!variant?.pdb_file) return;
    setPdbText(null);
    setLoadError(null);
    fetchPdbText(variant.pdb_file)
      .then(setPdbText)
      .catch((e) => setLoadError(e.message));
  }, [variant?.pdb_file]);

  // ── Build viewer (model only, no render — style effect renders) ─────────────
  useEffect(() => {
    if (!ready || !containerRef.current || !pdbText) return;
    containerRef.current.innerHTML = "";
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: T.ink,
      antialias: true,
    });
    viewer.addModel(pdbText, "pdb");
    viewerRef.current = viewer;

    // Click: select residue
    try {
      viewer.setClickable({}, true, (atom) => {
        const resi = atom.resi;
        const resn = resn3to1(atom.resn);
        const cb = onResidueSelectRef.current;
        if (cb) cb((prev) => (prev?.resi === resi ? null : { resi, resn }));
      });
    } catch (e) { /* 3Dmol version may not support */ }

    // Hover: label residue
    try {
      viewer.setHoverable({}, true,
        (atom) => setHovered({ resi: atom.resi, resn: atom.resn, aa: resn3to1(atom.resn) }),
        () => setHovered(null)
      );
    } catch (e) { /* optional feature */ }

    viewer.zoomTo();
    viewer.zoom(1.1, 600);
    return () => {
      try { viewer.clear(); } catch (_) {}
      viewerRef.current = null;
    };
  }, [ready, pdbText]);

  // ── Apply all styles / coloring (re-runs whenever display state changes) ────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // --- Base representation ---
    const baseCartoon = { thickness: 0.5 };
    const baseStick = showSideChains ? { radius: 0.07 } : null;

    if (colorMode === "hydrophob" && variant?.sequence) {
      // Per-residue Kyte-Doolittle coloring
      if (viewStyle === "stick") {
        viewer.setStyle({}, { stick: { radius: 0.15, colorscheme: "amino" } });
      } else {
        viewer.setStyle({}, { cartoon: { color: "#ccc", ...baseCartoon } });
        variant.sequence.split("").forEach((aa, i) => {
          const resn = AA1TO3[aa] ?? "ALA";
          const col = kdColor(resn);
          const style = { cartoon: { color: col, ...baseCartoon } };
          if (baseStick) style.stick = { ...baseStick, color: col };
          viewer.setStyle({ resi: i + 1 }, style);
        });
      }

    } else if (colorMode === "charge" && variant?.sequence) {
      // Per-residue electrostatic charge (D/E=red, K/R=blue, neutral=gray)
      viewer.setStyle({}, { cartoon: { color: "#aaaaaa", ...baseCartoon } });
      variant.sequence.split("").forEach((aa, i) => {
        const col = chargeColor(aa);
        if (col === "#aaaaaa") return; // skip neutrals (already set)
        const style = { cartoon: { color: col, ...baseCartoon } };
        if (baseStick) style.stick = { ...baseStick, color: col };
        viewer.setStyle({ resi: i + 1 }, style);
      });

    } else if (colorMode === "agg" && variant?.sap_arr?.length) {
      // Per-residue aggregation propensity (gray → orange → red)
      viewer.setStyle({}, { cartoon: { color: "#aaaaaa", ...baseCartoon } });
      variant.sap_arr.forEach((val, i) => {
        if (val === 0) return;
        const col = sapColor(val);
        const style = { cartoon: { color: col, ...baseCartoon } };
        if (baseStick) style.stick = { ...baseStick, color: col };
        viewer.setStyle({ resi: i + 1 }, style);
      });

    } else {
      // Default teal coloring
      if (viewStyle === "stick") {
        viewer.setStyle({}, { stick: { colorscheme: "amino", radius: 0.15 } });
      } else if (viewStyle === "sphere") {
        viewer.setStyle({}, { sphere: { colorscheme: "amino", scale: 0.32 } });
      } else {
        const s = { cartoon: { color: T.tealLight, ...baseCartoon } };
        if (baseStick) s.stick = { ...baseStick, colorscheme: "amino" };
        viewer.setStyle({}, s);
      }
    }

    // --- Catalytic triad overlay (always on top when active) ---
    if (colorMode === "triad" && variant?.cat_S && variant?.cat_D && variant?.cat_H) {
      // Reset base first so triad stands out
      viewer.setStyle({}, { cartoon: { color: "#444", ...baseCartoon } });
      [
        { resi: variant.cat_S, color: T.brass,     label: "Ser" },
        { resi: variant.cat_D, color: "#e05c5c",   label: "Asp" },
        { resi: variant.cat_H, color: "#5c9be0",   label: "His" },
      ].forEach(({ resi, color }) => {
        viewer.setStyle({ resi }, {
          sphere: { color, radius: 1.3 },
          stick:  { color, radius: 0.2 },
        });
      });
    }

    // --- Selected residue highlight (always on top) ---
    if (selectedResidue?.resi) {
      viewer.setStyle({ resi: selectedResidue.resi }, {
        sphere: { color: "#FFFFFF", radius: 1.1 },
        stick:  { color: "#FFFFFF", radius: 0.18 },
      });
    }

    viewer.render();
  }, [viewStyle, showSideChains, colorMode, variant, selectedResidue, pdbText]);

  // ── Derived state for UI labels ──────────────────────────────────────────────
  const hasCatTriad = !!(variant?.cat_S && variant?.cat_D && variant?.cat_H);
  const hasAgg = !!(variant?.sap_arr?.length);

  const toggleMode = (mode) => setColorMode((prev) => (prev === mode ? null : mode));

  // ── Legend for active mode ───────────────────────────────────────────────────
  const legends = {
    hydrophob: [
      { color: "rgb(230,60,30)",  label: "Hydrophobic (+4.5)" },
      { color: "rgb(150,60,150)", label: "Neutral" },
      { color: "rgb(30,60,230)",  label: "Hydrophilic (−4.5)" },
    ],
    charge: [
      { color: "#e05c5c", label: "Negative (D, E)" },
      { color: "#aaaaaa", label: "Neutral" },
      { color: "#9bc0e0", label: "His (H)" },
      { color: "#5c9be0", label: "Positive (K, R)" },
    ],
    agg: [
      { color: "#aaaaaa", label: "Low SAP" },
      { color: sapColor(40), label: "Moderate" },
      { color: sapColor(80), label: "High (sticky)" },
    ],
  };
  const activeLegend = colorMode && colorMode !== "triad" ? legends[colorMode] : null;

  if (loadError) {
    return (
      <div style={{ height: 340, display: "flex", alignItems: "center", justifyContent: "center", color: T.rust, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, padding: 20, textAlign: "center" }}>
        Could not load structure: {loadError}
      </div>
    );
  }

  return (
    <div>
      {/* ── Controls: representation ── */}
      <div style={{ background: T.ink, padding: "8px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(247,245,239,0.08)" }}>
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 14, color: T.paper, marginRight: 4 }}>Structure</span>
        <span style={{ fontSize: 10, color: T.slate, fontFamily: "Inter, sans-serif" }}>Style</span>
        {["cartoon", "stick", "sphere"].map((s) => (
          <button key={s} onClick={() => setViewStyle(s)} style={ctrlBtn(viewStyle === s, false)}>{s}</button>
        ))}
        <div style={{ width: 1, height: 16, background: "rgba(247,245,239,0.15)" }} />
        <button
          onClick={() => setShowSideChains((v) => !v)}
          style={ctrlBtn(showSideChains, viewStyle !== "cartoon")}
          disabled={viewStyle !== "cartoon"}
        >
          side chains
        </button>
        {hovered && (
          <span style={{ marginLeft: "auto", fontSize: 10.5, fontFamily: "JetBrains Mono, monospace", color: T.brass }}>
            {hovered.resn} {hovered.aa}{hovered.resi}
          </span>
        )}
      </div>

      {/* ── Controls: visualization modes ── */}
      <div style={{ background: "#0d1d23", padding: "7px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(247,245,239,0.08)" }}>
        <span style={{ fontSize: 10, color: T.slate, fontFamily: "Inter, sans-serif", marginRight: 2 }}>Highlight</span>

        {/* 1. Catalytic Triad */}
        <button
          onClick={() => hasCatTriad && toggleMode("triad")}
          style={ctrlBtn(colorMode === "triad", !hasCatTriad)}
          title={hasCatTriad ? "Highlight Ser/Asp/His catalytic triad" : "Catalytic triad residue indices not available"}
        >
          Catalytic Triad {!hasCatTriad && <span style={{ opacity: 0.5, fontSize: 9 }}>(n/a)</span>}
        </button>

        {/* 2. Residue Hydrophobicity */}
        <button
          onClick={() => toggleMode("hydrophob")}
          style={ctrlBtn(colorMode === "hydrophob", false)}
          title="Per-residue Kyte-Doolittle hydrophobicity (red = hydrophobic, blue = hydrophilic)"
        >
          Hydrophobicity
        </button>

        {/* 3. Electrostatics */}
        <button
          onClick={() => toggleMode("charge")}
          style={ctrlBtn(colorMode === "charge", false)}
          title="Per-residue charge: D/E = negative (red), K/R = positive (blue), neutral = gray"
        >
          Electrostatics
        </button>

        {/* 4. Aggregation Risk (Rosetta SAP) */}
        <button
          onClick={() => hasAgg && toggleMode("agg")}
          style={ctrlBtn(colorMode === "agg", !hasAgg)}
          title="Per-residue Spatial Aggregation Propensity (Rosetta SAP): gray = low, red = high aggregation risk"
        >
          Aggregation Risk
        </button>

        {colorMode && colorMode !== "triad" && (
          <button onClick={() => setColorMode(null)} style={{ ...ctrlBtn(false, false), marginLeft: "auto", fontSize: 9, opacity: 0.7 }}>
            reset color
          </button>
        )}
      </div>

      {/* ── Viewer ── */}
      <div style={{ position: "relative" }}>
        {(!ready || !pdbText) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.paper, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, letterSpacing: 0.3, zIndex: 1 }}>
            Loading structure…
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: 320, background: T.ink, position: "relative" }} />
      </div>

      {/* ── Info bar ── */}
      <div style={{ background: T.ink, padding: "6px 16px", minHeight: 26, display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(247,245,239,0.08)", flexWrap: "wrap" }}>
        {selectedResidue ? (
          <>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: T.paper }}>
              Selected: <strong style={{ color: T.brass }}>{selectedResidue.resn}</strong>
              <span style={{ color: T.slate }}> position </span>
              <strong style={{ color: T.brass }}>{selectedResidue.resi}</strong>
            </span>
            <button onClick={() => onResidueSelect(null)} style={{ border: "none", background: "none", color: T.slate, fontSize: 10, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}>
              clear
            </button>
          </>
        ) : (
          <span style={{ fontSize: 10.5, color: T.slate, fontFamily: "Inter, sans-serif" }}>
            Click an atom to select a residue · hover to identify
          </span>
        )}

        {/* Color legend */}
        {activeLegend && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {activeLegend.map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, fontFamily: "Inter, sans-serif", color: T.slate }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, display: "inline-block", flexShrink: 0 }} />
                {item.label}
              </span>
            ))}
          </div>
        )}

        {/* Triad legend */}
        {colorMode === "triad" && hasCatTriad && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
            {[
              { color: T.brass,   label: `Ser ${variant.cat_S}` },
              { color: "#e05c5c", label: `Asp ${variant.cat_D}` },
              { color: "#5c9be0", label: `His ${variant.cat_H}` },
            ].map((item, i) => (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9.5, fontFamily: "Inter, sans-serif", color: T.slate }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, display: "inline-block" }} />
                {item.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
