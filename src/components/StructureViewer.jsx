import React, { useEffect, useRef, useState } from "react";
import { T } from "../theme.js";
import { useInjectedScript } from "../utils.js";
import { fetchPdbText } from "../useVariantData.js";

// StructureViewer: loads the real per-variant PDB file from /pdb/{file}
// and renders it with 3Dmol.js (CDN-loaded, not bundled). Catalytic-triad
// residues (cat.S / cat.D / cat.H columns in annotated_df_11.csv) are
// highlighted as spheres when available and toggled on.
export function StructureViewer({ variant, highlightActiveSite }) {
  const ready = useInjectedScript("https://3Dmol.org/build/3Dmol-min.js", () => !!window.$3Dmol);
  const containerRef = useRef(null);
  const [pdbText, setPdbText] = useState(null);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    if (!variant?.pdb_file) return;
    setPdbText(null);
    setLoadError(null);
    fetchPdbText(variant.pdb_file)
      .then(setPdbText)
      .catch((e) => setLoadError(e.message));
  }, [variant?.pdb_file]);

  useEffect(() => {
    if (!ready || !containerRef.current || !pdbText) return;
    containerRef.current.innerHTML = "";
    const viewer = window.$3Dmol.createViewer(containerRef.current, { backgroundColor: T.ink });

    viewer.addModel(pdbText, "pdb");
    viewer.setStyle({}, { cartoon: { color: T.tealLight, thickness: 0.5 }, line: {} });
    viewer.setStyle({ cartoon: { style: "trace" } }, { cartoon: { color: T.tealLight, thickness: 0.6 } });

    if (highlightActiveSite && variant?.cat_S && variant?.cat_D && variant?.cat_H) {
      [variant.cat_S, variant.cat_D, variant.cat_H].forEach((resi) => {
        viewer.setStyle({ resi: resi }, { sphere: { color: T.brass, radius: 1.4 } });
      });
    }

    viewer.zoomTo();
    viewer.render();
    viewer.zoom(1.1, 600);

    return () => {
      try {
        viewer.clear();
      } catch (e) {
        /* viewer already torn down */
      }
    };
  }, [ready, pdbText, highlightActiveSite, variant]);

  if (loadError) {
    return (
      <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: T.rust, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, padding: 20, textAlign: "center" }}>
        Could not load structure file: {loadError}
      </div>
    );
  }

  if (!ready || !pdbText) {
    return (
      <div style={{ height: 360, display: "flex", alignItems: "center", justifyContent: "center", color: T.paper, background: T.ink, fontFamily: "Inter, sans-serif", fontSize: 13, letterSpacing: 0.3 }}>
        Loading structure…
      </div>
    );
  }

  return <div ref={containerRef} style={{ width: "100%", height: 360, background: T.ink, position: "relative" }} />;
}
