import React, { useMemo, useState } from "react";
import { T } from "../theme.js";
import { FEATURES } from "../features.js";

const W = 500, H = 300;
const PAD = { left: 46, right: 16, top: 16, bottom: 44 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;
const TICK_COUNT = 5;

function axisRange(min, max) {
  const span = max - min || 1;
  const pad = span * 0.05;
  return [min - pad, max + pad];
}

export function ScatterPlot({ allVariants, selectedId, compareId, onSelectVariant }) {
  const [featureX, setFeatureX] = useState("activity_2");
  const [featureY, setFeatureY] = useState("expression");
  const [tooltip, setTooltip] = useState(null);

  const fxMeta = FEATURES.find((f) => f.key === featureX);
  const fyMeta = FEATURES.find((f) => f.key === featureY);

  const { points, xRange, yRange } = useMemo(() => {
    const valid = allVariants.filter(
      (v) => v[featureX] != null && v[featureX] !== -1 && v[featureY] != null && v[featureY] !== -1
    );
    if (!valid.length) return { points: [], xRange: [0, 1], yRange: [0, 1] };

    let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
    for (const v of valid) {
      if (v[featureX] < xMin) xMin = v[featureX];
      if (v[featureX] > xMax) xMax = v[featureX];
      if (v[featureY] < yMin) yMin = v[featureY];
      if (v[featureY] > yMax) yMax = v[featureY];
    }
    const xRange = axisRange(xMin, xMax);
    const yRange = axisRange(yMin, yMax);
    const xSpan = xRange[1] - xRange[0];
    const ySpan = yRange[1] - yRange[0];

    const points = valid.map((v) => ({
      id: v.id,
      cx: PAD.left + ((v[featureX] - xRange[0]) / xSpan) * PLOT_W,
      cy: PAD.top + (1 - (v[featureY] - yRange[0]) / ySpan) * PLOT_H,
      xVal: v[featureX],
      yVal: v[featureY],
    }));

    return { points, xRange, yRange };
  }, [allVariants, featureX, featureY]);

  // Ticks
  const xTicks = useMemo(() => {
    const [lo, hi] = xRange;
    return Array.from({ length: TICK_COUNT }, (_, i) => {
      const val = lo + (i / (TICK_COUNT - 1)) * (hi - lo);
      return { val, x: PAD.left + ((val - lo) / (hi - lo)) * PLOT_W };
    });
  }, [xRange]);

  const yTicks = useMemo(() => {
    const [lo, hi] = yRange;
    return Array.from({ length: TICK_COUNT }, (_, i) => {
      const val = lo + (i / (TICK_COUNT - 1)) * (hi - lo);
      return { val, y: PAD.top + (1 - (val - lo) / (hi - lo)) * PLOT_H };
    });
  }, [yRange]);

  const SELECT_COLOR = T.brass;
  const CMP_COLOR = T.tealLight;
  const BASE_COLOR = T.teal;

  // Separate selected/compare from the rest for z-ordering
  const basePts = points.filter((p) => p.id !== selectedId && p.id !== compareId);
  const selPt = points.find((p) => p.id === selectedId);
  const cmpPt = points.find((p) => p.id === compareId);

  return (
    <div>
      {/* Feature selectors */}
      <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif" }}>X</span>
          <select
            value={featureX}
            onChange={(e) => setFeatureX(e.target.value)}
            style={{ fontSize: 11.5, fontFamily: "Inter, sans-serif", border: `1px solid ${T.paperDim}`, borderRadius: 4, padding: "3px 6px", background: "#fff", color: T.ink, cursor: "pointer" }}
          >
            {FEATURES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: T.slate, fontFamily: "Inter, sans-serif" }}>Y</span>
          <select
            value={featureY}
            onChange={(e) => setFeatureY(e.target.value)}
            style={{ fontSize: 11.5, fontFamily: "Inter, sans-serif", border: `1px solid ${T.paperDim}`, borderRadius: 4, padding: "3px 6px", background: "#fff", color: T.ink, cursor: "pointer" }}
          >
            {FEATURES.map((f) => (
              <option key={f.key} value={f.key}>{f.label}</option>
            ))}
          </select>
        </div>
        <span style={{ fontSize: 10.5, color: T.slate, fontFamily: "Inter, sans-serif", marginLeft: "auto" }}>
          {points.length} variants · click to select
        </span>
      </div>

      {/* SVG Plot */}
      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block", overflow: "visible" }}
        >
          {/* Grid lines */}
          {xTicks.map((t, i) => (
            <line key={i} x1={t.x} y1={PAD.top} x2={t.x} y2={PAD.top + PLOT_H}
              stroke={T.paperDim} strokeWidth={0.5} />
          ))}
          {yTicks.map((t, i) => (
            <line key={i} x1={PAD.left} y1={t.y} x2={PAD.left + PLOT_W} y2={t.y}
              stroke={T.paperDim} strokeWidth={0.5} />
          ))}

          {/* Axes */}
          <line x1={PAD.left} y1={PAD.top + PLOT_H} x2={PAD.left + PLOT_W} y2={PAD.top + PLOT_H}
            stroke={T.slate} strokeWidth={1} />
          <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + PLOT_H}
            stroke={T.slate} strokeWidth={1} />

          {/* X ticks + labels */}
          {xTicks.map((t, i) => (
            <g key={i}>
              <line x1={t.x} y1={PAD.top + PLOT_H} x2={t.x} y2={PAD.top + PLOT_H + 5} stroke={T.slate} strokeWidth={1} />
              <text x={t.x} y={PAD.top + PLOT_H + 15} textAnchor="middle" fontSize={9}
                fill={T.slate} fontFamily="JetBrains Mono, monospace">
                {t.val.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Y ticks + labels */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PAD.left - 5} y1={t.y} x2={PAD.left} y2={t.y} stroke={T.slate} strokeWidth={1} />
              <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fontSize={9}
                fill={T.slate} fontFamily="JetBrains Mono, monospace">
                {t.val.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Axis labels */}
          <text x={PAD.left + PLOT_W / 2} y={H - 4} textAnchor="middle" fontSize={10}
            fill={T.ink} fontFamily="Inter, sans-serif">
            {fxMeta?.label}
          </text>
          <text
            x={10} y={PAD.top + PLOT_H / 2}
            textAnchor="middle" fontSize={10}
            fill={T.ink} fontFamily="Inter, sans-serif"
            transform={`rotate(-90, 10, ${PAD.top + PLOT_H / 2})`}
          >
            {fyMeta?.label}
          </text>

          {/* Base dots */}
          {basePts.map((p) => (
            <circle
              key={p.id}
              cx={p.cx} cy={p.cy} r={2.5}
              fill={BASE_COLOR} opacity={0.4}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectVariant(p.id)}
              onMouseEnter={() => setTooltip(p)}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}

          {/* Compare dot */}
          {cmpPt && (
            <circle
              cx={cmpPt.cx} cy={cmpPt.cy} r={7}
              fill={CMP_COLOR} opacity={0.85} stroke="#fff" strokeWidth={1.5}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectVariant(cmpPt.id)}
              onMouseEnter={() => setTooltip(cmpPt)}
              onMouseLeave={() => setTooltip(null)}
            />
          )}

          {/* Selected dot */}
          {selPt && (
            <circle
              cx={selPt.cx} cy={selPt.cy} r={8}
              fill={SELECT_COLOR} opacity={1} stroke={T.ink} strokeWidth={1.5}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectVariant(selPt.id)}
              onMouseEnter={() => setTooltip(selPt)}
              onMouseLeave={() => setTooltip(null)}
            />
          )}

          {/* Tooltip */}
          {tooltip && (() => {
            const tx = tooltip.cx > W * 0.7 ? tooltip.cx - 110 : tooltip.cx + 10;
            const ty = tooltip.cy < PAD.top + 40 ? tooltip.cy + 14 : tooltip.cy - 36;
            return (
              <g>
                <rect x={tx} y={ty} width={106} height={34} rx={4}
                  fill={T.ink} stroke={T.brass} strokeWidth={0.8} opacity={0.95} />
                <text x={tx + 6} y={ty + 13} fontSize={10} fill={T.brass}
                  fontFamily="JetBrains Mono, monospace">{tooltip.id}</text>
                <text x={tx + 6} y={ty + 26} fontSize={9} fill={T.paper}
                  fontFamily="JetBrains Mono, monospace">
                  {fxMeta?.fmt(tooltip.xVal)} · {fyMeta?.fmt(tooltip.yVal)}
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginTop: 6, fontSize: 10.5, fontFamily: "Inter, sans-serif", color: T.slate }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={SELECT_COLOR} /></svg>
          selected
        </span>
        {compareId && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={CMP_COLOR} /></svg>
            compare
          </span>
        )}
      </div>
    </div>
  );
}
