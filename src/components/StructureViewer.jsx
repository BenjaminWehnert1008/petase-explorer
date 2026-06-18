import React, { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import { useInjectedScript } from "../utils.js";
import { fetchPdbText } from "../useVariantData.js";
import { resn3to1 } from "./SequenceStrip.jsx";

const BTN = (active) => ({
  border: `1px solid ${active ? T.brass : "rgba(247,245,239,0.25)"}`,
  background: active ? "rgba(201,162,39,0.18)" : "transparent",
  color: active ? T.brass : T.paper,
  borderRadius: 4,
  padding: "3px 9px",
  fontSize: 10.5,
  cursor: "pointer",
  fontFamily: "Inter, sans-serif",
});

export function StructureViewer({ variant, selectedResidue, onResidueSelect }) {
  const ready = useInjectedScript("https://3Dmol.org/build/3Dmol-min.js", () => !!window.$3Dmol);
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const onResidueSelectRef = useRef(onResidueSelect);

  const [pdbText, setPdbText] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [viewStyle, setViewStyle] = useState("cartoon");
  const [showSideChains, setShowSideChains] = useState(false);
  const [highlightActiveSite, setHighlightActiveSite] = useState(true);
  const [hovered, setHovered] = useState(null);

  // Keep callback ref current so the click handler never goes stale
  useEffect(() => { onResidueSelectRef.current = onResidueSelect; }, [onResidueSelect]);

  // Load PDB on variant change
  useEffect(() => {
    if (!variant?.pdb_file) return;
    setPdbText(null);
    setLoadError(null);
    fetchPdbText(variant.pdb_file)
      .then(setPdbText)
      .catch((e) => setLoadError(e.message));
  }, [variant?.pdb_file]);

  // Build viewer when PDB text arrives
  useEffect(() => {
    if (!ready || !containerRef.current || !pdbText) return;
    containerRef.current.innerHTML = "";
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: T.ink,
      antialias: true,
    });
    viewer.addModel(pdbText, "pdb");
    viewerRef.current = viewer;

    // Click → select residue
    viewer.setClickable({}, true, (atom) => {
      const resi = atom.resi;
      const resn = resn3to1(atom.resn);
      const current = onResidueSelectRef.current;
      if (current) current((prev) => prev?.resi === resi ? null : { resi, resn });
    });

    // Hover → show tooltip
    viewer.setHoverable({}, true,
      (atom) => setHovered({ resi: atom.resi, resn: atom.resn, aa: resn3to1(atom.resn) }),
      () => setHovered(null)
    );

    viewer.zoomTo();
    viewer.zoom(1.1, 600);
    // Styles applied by next effect
  }, [ready, pdbText]);

  // Re-apply all styles whenever display params or selection change.
  // Also triggers after pdbText changes because pdbText is in deps.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // Base representation
    if (viewStyle === "cartoon") {
      if (showSideChains) {
        viewer.setStyle({}, {
          cartoon: { color: T.tealLight, thickness: 0.5 },
          stick: { radius: 0.07, colorscheme: "amino" },
        });
      } else {
        viewer.setStyle({}, { cartoon: { color: T.tealLight, thickness: 0.5 } });
      }
    } else if (viewStyle === "stick") {
      viewer.setStyle({}, { stick: { colorscheme: "amino", radius: 0.15 } });
    } else if (viewStyle === "sphere") {
      viewer.setStyle({}, { sphere: { colorscheme: "amino", scale: 0.32 } });
    }

    // Catalytic triad (brass spheres)
    if (highlightActiveSite && variant?.cat_S && variant?.cat_D && variant?.cat_H) {
      [variant.cat_S, variant.cat_D, variant.cat_H].forEach((resi) => {
        viewer.setStyle({ resi }, { sphere: { color: T.brass, radius: 1.4 } });
      });
    }

    // Selected residue (white highlight)
    if (selectedResidue?.resi) {
      viewer.setStyle(
        { resi: selectedResidue.resi },
        { sphere: { color: "#FFFFFF", radius: 1.1 }, stick: { color: "#FFFFFF", radius: 0.18 } }
      );
    }

    viewer.render();
  }, [viewStyle, showSideChains, highlightActiveSite, variant, selectedResidue, pdbText]);

  const hasCatTriad = variant?.cat_S && variant?.cat_D && variant?.cat_H;

  if (loadError) {
    return (
      <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: T.rust, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, padding: 20, textAlign: "center" }}>
        Could not load structure: {loadError}
      </div>
    );
  }

  return (
    <div>
      {/* Controls bar */}
      <div style={{ background: T.ink, padding: "8px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(247,245,239,0.1)" }}>
        <span style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 14, color: T.paper, marginRight: 6 }}>Structure</span>
        <span style={{ fontSize: 10, color: T.slate, fontFamily: "Inter, sans-serif", marginRight: 2 }}>Style</span>
        {["cartoon", "stick", "sphere"].map((s) => (
          <button key={s} onClick={() => setViewStyle(s)} style={BTN(viewStyle === s)}>
            {s}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: "rgba(247,245,239,0.15)", margin: "0 2px" }} />
        <button
          onClick={() => setShowSideChains((v) => !v)}
          style={BTN(showSideChains)}
          disabled={viewStyle !== "cartoon"}
        >
          side chains
        </button>
        <div style={{ width: 1, height: 16, background: "rgba(247,245,239,0.15)", margin: "0 2px" }} />
        <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: hasCatTriad ? T.paper : T.slate, fontFamily: "Inter, sans-serif", cursor: hasCatTriad ? "pointer" : "default" }}>
          <input
            type="checkbox"
            checked={highlightActiveSite}
            disabled={!hasCatTriad}
            onChange={(e) => setHighlightActiveSite(e.target.checked)}
            style={{ accentColor: T.brass }}
          />
          catalytic triad {!hasCatTriad && <span style={{ color: T.slate, fontSize: 9 }}>(n/a)</span>}
        </label>

        {/* Hovered residue info */}
        {hovered && (
          <span style={{ marginLeft: "auto", fontSize: 10.5, fontFamily: "JetBrains Mono, monospace", color: T.brass }}>
            {hovered.resn} {hovered.aa}{hovered.resi}
          </span>
        )}
      </div>

      {/* Viewer */}
      <div style={{ position: "relative" }}>
        {(!ready || !pdbText) && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: T.paper, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, letterSpacing: 0.3, zIndex: 1 }}>
            Loading structure…
          </div>
        )}
        <div ref={containerRef} style={{ width: "100%", height: 340, background: T.ink, position: "relative" }} />
      </div>

      {/* Selected residue info bar */}
      <div style={{ background: T.ink, padding: "6px 16px", minHeight: 26, display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid rgba(247,245,239,0.1)" }}>
        {selectedResidue ? (
          <>
            <span style={{ fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: T.paper }}>
              Selected: <strong style={{ color: T.brass }}>{selectedResidue.resn}</strong>
              <span style={{ color: T.slate }}> at position </span>
              <strong style={{ color: T.brass }}>{selectedResidue.resi}</strong>
            </span>
            <button
              onClick={() => onResidueSelect(null)}
              style={{ border: "none", background: "none", color: T.slate, fontSize: 10, cursor: "pointer", fontFamily: "Inter, sans-serif", padding: 0 }}
            >
              clear
            </button>
          </>
        ) : (
          <span style={{ fontSize: 10.5, color: T.slate, fontFamily: "Inter, sans-serif" }}>
            Click an atom to select a residue · hover to identify
          </span>
        )}
      </div>
    </div>
  );
}
