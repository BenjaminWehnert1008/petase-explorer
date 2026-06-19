import React, { useState, useMemo, useCallback } from "react";
import { T } from "./theme.js";
import { FEATURES, FEATURE_GROUPS } from "./features.js";
import { percentileOf } from "./utils.js";
import { useVariantData, fetchSapData } from "./useVariantData.js";
import { TickRuler } from "./components/TickRuler.jsx";
import { DistributionPlot } from "./components/DistributionPlot.jsx";
import { StructureViewer } from "./components/StructureViewer.jsx";
import { SequenceStrip } from "./components/SequenceStrip.jsx";
import { ScoreGauge } from "./components/ScoreGauge.jsx";
import { VariantRow } from "./components/VariantRow.jsx";
import { ScatterPlot } from "./components/ScatterPlot.jsx";

const bg = T.paper;
const fg = T.ink;
const panelBg = "#FFFFFF";
const border = T.paperDim;

export default function App() {
  const { variants, error } = useVariantData();

  const [selectedId, setSelectedId] = useState(null);
  const [compareId, setCompareId] = useState(null);
  const [search, setSearch] = useState("");
  const [minActivity1, setMinActivity1] = useState(0);
  const [minExpression, setMinExpression] = useState(0);
  const [sortKey, setSortKey] = useState("activity_2");
  const [activeFeature, setActiveFeature] = useState("pet_msa_affinity");
  const [selectedResidue, setSelectedResidue] = useState(null);
  const [sapData, setSapData] = useState(null);

  const loadSapData = useCallback(() => {
    if (sapData) return;
    fetchSapData().then(setSapData).catch(console.error);
  }, [sapData]);

  // Reset residue selection when the active variant changes
  React.useEffect(() => { setSelectedResidue(null); }, [selectedId]);

  // Pick a default selection once data arrives
  React.useEffect(() => {
    if (variants && variants.length && !selectedId) {
      setSelectedId(variants[0].id);
    }
  }, [variants, selectedId]);

  const selected = variants && selectedId ? variants.find((v) => v.id === selectedId) : null;
  const compareVariant = variants && compareId ? variants.find((v) => v.id === compareId) : null;

  const filtered = useMemo(() => {
    if (!variants) return [];
    return variants
      .filter(
        (v) =>
          (v.id.toLowerCase().includes(search.toLowerCase()) ||
            v.organism.toLowerCase().includes(search.toLowerCase())) &&
          v.activity_1 >= minActivity1 &&
          v.expression >= minExpression
      )
      .sort((a, b) => b[sortKey] - a[sortKey]);
  }, [variants, search, minActivity1, minExpression, sortKey]);

  const activeFeatureMeta = FEATURES.find((f) => f.key === activeFeature);

  // Pre-compute per-feature value arrays once so percentileOf doesn't re-sort on every render
  const featureValues = useMemo(() => {
    if (!variants) return {};
    const out = {};
    FEATURES.forEach((f) => { out[f.key] = variants.map((v) => v[f.key]); });
    return out;
  }, [variants]);

  const TABLE_LIMIT = 200;
  const visibleRows = filtered.slice(0, TABLE_LIMIT);

  const downloadCsv = useCallback(() => {
    const headers = ["id", "organism", "activity_1", "activity_2", "expression"];
    const rows = filtered.map((v) => headers.map((h) => v[h]).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "petase_filtered_variants.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (error) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: T.rust }}>
        <h2>Could not load data</h2>
        <p>{error}</p>
        <p style={{ color: T.slate, fontSize: 13 }}>
          Make sure <code>public/data/variants.json</code> exists — run{" "}
          <code>npm run convert-data</code> first, then <code>npm run dev</code>.
        </p>
      </div>
    );
  }

  if (!variants) {
    return (
      <div style={{ padding: 40, fontFamily: "Inter, sans-serif", color: T.slate }}>
        Loading variant data…
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: fg, fontFamily: "Inter, sans-serif" }}>
      <header style={{ borderBottom: `2px solid ${fg}`, padding: "22px 28px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div style={{ maxWidth: 680 }}>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: 2, color: T.brass, textTransform: "uppercase", marginBottom: 4 }}>
              PETbusters · zero-shot track
            </div>
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 34, fontWeight: 600, margin: "0 0 8px", letterSpacing: -0.5 }}>
              Variant Explorer
            </h1>
            <p style={{ margin: 0, fontSize: 13, color: T.slate, lineHeight: 1.6 }}>
              An interactive explorer for {variants.length} PETase sequence variants from the PETbusters zero-shot competition track.
              Browse and filter by predicted catalysis and expression scores, inspect 3D structures residue by residue, and cross-correlate
              biophysical features in the scatter plot below to spot trade-offs across the design space.
            </p>
          </div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11.5, color: T.slate, paddingTop: 4 }}>
            {variants.length} variants loaded
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          <TickRuler ticks={64} accent={false} />
        </div>
      </header>

      <main style={{ padding: "24px 28px 60px", display: "flex", gap: 24, flexWrap: "wrap" }}>

        {/* ── Left panel: variant browser ── */}
        <section style={{ flex: "1 1 420px", minWidth: 380, maxWidth: 560 }}>
          <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 12, display: "flex", alignItems: "baseline", gap: 8 }}>
            Variant browser
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: T.slate, fontWeight: 400 }}>{filtered.length} shown</span>
          </div>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID or organism…"
            style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", border: `1px solid ${border}`, borderRadius: 6, background: panelBg, color: fg, fontFamily: "Inter, sans-serif", fontSize: 13, marginBottom: 10 }}
          />

          <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
            <label style={{ flex: 1, minWidth: 150, fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif" }}>
              Min. activity (pH 5.5): <strong style={{ color: fg }}>{minActivity1.toFixed(2)}</strong>
              <input type="range" min="0" max="1" step="0.01" value={minActivity1} onChange={(e) => setMinActivity1(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
            </label>
            <label style={{ flex: 1, minWidth: 150, fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif" }}>
              Min. expression: <strong style={{ color: fg }}>{minExpression.toFixed(2)}</strong>
              <input type="range" min="0" max="1" step="0.01" value={minExpression} onChange={(e) => setMinExpression(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.teal }} />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: 11, color: T.slate }}>Sort by</span>
            {["activity_1", "activity_2", "expression"].map((k) => (
              <button
                key={k}
                onClick={() => setSortKey(k)}
                style={{ border: `1px solid ${sortKey === k ? T.teal : border}`, background: sortKey === k ? T.teal : "transparent", color: sortKey === k ? T.paper : fg, borderRadius: 14, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontFamily: "JetBrains Mono, monospace" }}
              >
                {k}
              </button>
            ))}
            <button
              onClick={downloadCsv}
              style={{ marginLeft: "auto", border: `1px solid ${T.brass}`, background: "transparent", color: "#8a6f1a", borderRadius: 14, padding: "3px 11px", fontSize: 11, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
            >
              export CSV
            </button>
          </div>

          <div style={{ border: `1px solid ${border}`, borderRadius: 8, maxHeight: 520, overflowY: "auto", background: panelBg }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ position: "sticky", top: 0, background: panelBg, zIndex: 1 }}>
                  {["ID", "Organism", "Act. 5.5", "Act. 9", "Expr.", ""].map((h, i) => (
                    <th key={i} style={{ textAlign: i >= 2 && i <= 4 ? "right" : "left", padding: "8px 10px", fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: T.slate, borderBottom: `1px solid ${border}`, fontFamily: "Inter, sans-serif" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((v) => (
                  <VariantRow
                    key={v.id}
                    v={v}
                    isSelected={v.id === selectedId}
                    isCompare={v.id === compareId}
                    onClick={() => setSelectedId(v.id)}
                    onCompareClick={() => setCompareId(v.id === compareId ? null : v.id)}
                  />
                ))}
                {filtered.length > TABLE_LIMIT && (
                  <tr>
                    <td colSpan={6} style={{ padding: "10px", textAlign: "center", fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif", borderTop: `1px solid ${border}` }}>
                      Showing {TABLE_LIMIT} of {filtered.length} — use filters or search to narrow results
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Right panel: selected variant detail ── */}
        <section style={{ flex: "2 1 600px", minWidth: 380 }}>
          {selected && (
            <>
              {/* Variant header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: T.brass }}>{selected.id}</div>
                  <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 600 }}>{selected.organism}</div>
                </div>
                {compareVariant && (
                  <div style={{ fontSize: 11.5, fontFamily: "Inter, sans-serif", color: T.slate, border: `1px solid ${border}`, borderRadius: 6, padding: "6px 10px", background: panelBg }}>
                    Comparing against <strong style={{ color: T.teal, fontFamily: "JetBrains Mono, monospace" }}>{compareVariant.id}</strong>
                    <button onClick={() => setCompareId(null)} style={{ marginLeft: 8, border: "none", background: "none", color: T.rust, cursor: "pointer" }}>clear</button>
                  </div>
                )}
              </div>

              {/* Score gauges */}
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", background: panelBg, border: `1px solid ${border}`, borderRadius: 10, padding: "18px 20px", marginBottom: 20 }}>
                <ScoreGauge label="Catalysis · pH 5.5" value={selected.activity_1} fmt={(v) => v == null ? "n/a" : v.toFixed(3)} percentile={percentileOf(selected.activity_1, featureValues.activity_1 || [])} accent={T.teal} />
                <ScoreGauge label="Catalysis · pH 9" value={selected.activity_2} fmt={(v) => v == null ? "n/a" : v.toFixed(3)} percentile={percentileOf(selected.activity_2, featureValues.activity_2 || [])} accent={T.tealLight} />
                <ScoreGauge label="Expression" value={selected.expression} fmt={(v) => v == null ? "n/a" : v.toFixed(3)} percentile={percentileOf(selected.expression, featureValues.expression || [])} accent={T.rust} />
              </div>

              {/* Structure viewer + sequence strip */}
              <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: "hidden", marginBottom: 8 }}>
                <StructureViewer
                  variant={selected}
                  selectedResidue={selectedResidue}
                  onResidueSelect={setSelectedResidue}
                  sapData={sapData}
                  onLoadSapData={loadSapData}
                />
                <div style={{ background: T.ink, borderTop: "1px solid rgba(247,245,239,0.08)" }}>
                  <SequenceStrip
                    sequence={selected.sequence}
                    catS={selected.cat_S}
                    catD={selected.cat_D}
                    catH={selected.cat_H}
                    selectedResidue={selectedResidue}
                    onResidueSelect={setSelectedResidue}
                  />
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: T.slate, fontFamily: "Inter, sans-serif", marginBottom: 22 }}>
                Drag to rotate · scroll to zoom · click atom or sequence residue to select
              </div>

              {/* Feature inspector */}
              <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Feature inspector</div>
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px", display: "flex", flexDirection: "column", gap: 6, maxHeight: 460, overflowY: "auto" }}>
                  {FEATURE_GROUPS.map((group) => (
                    <div key={group}>
                      <div style={{ fontSize: 10.5, letterSpacing: 0.5, textTransform: "uppercase", color: T.slate, margin: "10px 0 4px 2px", fontFamily: "Inter, sans-serif" }}>
                        {group}
                      </div>
                      {FEATURES.filter((f) => f.group === group).map((f) => {
                        const isActive = f.key === activeFeature;
                        const pct = percentileOf(selected[f.key], featureValues[f.key] || []);
                        return (
                          <button
                            key={f.key}
                            onClick={() => setActiveFeature(f.key)}
                            style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 3, border: `1px solid ${isActive ? T.brass : border}`, background: isActive ? T.brassPale : panelBg, borderRadius: 6, cursor: "pointer", fontFamily: "Inter, sans-serif" }}
                          >
                            <span style={{ fontSize: 12.5, color: isActive ? T.ink : fg }}>{f.label}</span>
                            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: T.slate, whiteSpace: "nowrap" }}>
                              {f.fmt(selected[f.key])}
                              {pct !== null && <span style={{ marginLeft: 6, opacity: 0.7 }}>· p{pct}</span>}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div style={{ flex: "1 1 340px", minWidth: 320 }}>
                  <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: 16, background: panelBg }}>
                    <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 15, marginBottom: 4 }}>{activeFeatureMeta.label}</div>
                    <div style={{ fontSize: 11.5, color: T.slate, marginBottom: 10, lineHeight: 1.5 }}>{activeFeatureMeta.desc}</div>
                    <DistributionPlot featureKey={activeFeature} allVariants={variants} selected={selected} compareVariant={compareVariant} width={420} height={170} />
                    <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, fontFamily: "Inter, sans-serif" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.brass, display: "inline-block" }} />
                        {selected.id}: {activeFeatureMeta.fmt(selected[activeFeature])}
                      </span>
                      {compareVariant && (
                        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 9, height: 9, borderRadius: "50%", background: T.slate, display: "inline-block" }} />
                          {compareVariant.id}: {activeFeatureMeta.fmt(compareVariant[activeFeature])}
                        </span>
                      )}
                    </div>
                  </div>

                  {compareVariant && (
                    <div style={{ marginTop: 14, border: `1px solid ${border}`, borderRadius: 10, padding: 16, background: panelBg }}>
                      <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 14, marginBottom: 10 }}>
                        Side-by-side: {selected.id} vs {compareVariant.id}
                      </div>
                      {["activity_1", "activity_2", "expression"].map((k) => (
                        <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "4px 0", fontFamily: "JetBrains Mono, monospace" }}>
                          <span style={{ color: T.slate, fontFamily: "Inter, sans-serif" }}>{k}</span>
                          <span>
                            <strong style={{ color: T.brass }}>{selected[k]?.toFixed(3) ?? "n/a"}</strong>
                            {"  vs  "}
                            <strong style={{ color: T.slate }}>{compareVariant[k]?.toFixed(3) ?? "n/a"}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Scatter plot */}
              <div style={{ marginTop: 28 }}>
                <div style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 18, fontWeight: 600, marginBottom: 4 }}>Feature cross-correlation</div>
                <div style={{ fontSize: 12, color: T.slate, fontFamily: "Inter, sans-serif", marginBottom: 14, lineHeight: 1.5 }}>
                  Each dot is one variant. Click any dot to open it in the viewer above.
                </div>
                <div style={{ border: `1px solid ${border}`, borderRadius: 10, padding: "18px 20px", background: panelBg }}>
                  <ScatterPlot
                    allVariants={variants}
                    selectedId={selectedId}
                    compareId={compareId}
                    onSelectVariant={setSelectedId}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${border}`, padding: "16px 28px", fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif" }}>
        PETbusters zero-shot track — variant explorer.
      </footer>
    </div>
  );
}
