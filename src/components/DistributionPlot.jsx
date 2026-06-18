import React from "react";
import { T } from "../theme.js";

// DistributionPlot: lightweight dependency-free SVG histogram.
//
// SWAP TARGET: the project brief calls for Plotly.js here for proper
// pan/zoom/hover-tooltip interactivity. This SVG version is functionally
// equivalent (same highlighted-marker behavior for selected/compare
// variants) and keeps the bundle small for the prototype. To switch:
//   npm install plotly.js-dist-min
//   import Plotly from "plotly.js-dist-min";
// and render a Histogram trace with the same `values`, marking `selVal`/
// `cmpVal` via shapes (vertical lines), which is what this component does
// manually below.
export function DistributionPlot({ featureKey, allVariants, selected, compareVariant, width = 420, height = 170 }) {
  const values = allVariants
    .map((v) => v[featureKey])
    .filter((v) => v !== -1 && !Number.isNaN(v) && v !== undefined);

  if (!values.length) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const bins = 24;
  const counts = new Array(bins).fill(0);
  values.forEach((v) => {
    let b = Math.floor(((v - min) / span) * bins);
    if (b >= bins) b = bins - 1;
    if (b < 0) b = 0;
    counts[b]++;
  });
  const maxCount = Math.max(...counts);

  const padL = 8, padR = 8, padT = 10, padB = 26;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const barW = plotW / bins;

  const xForValue = (v) => padL + ((v - min) / span) * plotW;

  const selVal = selected ? selected[featureKey] : null;
  const cmpVal = compareVariant ? compareVariant[featureKey] : null;
  const hasSel = selVal !== null && selVal !== -1 && selVal !== undefined;
  const hasCmp = cmpVal !== null && cmpVal !== -1 && cmpVal !== undefined;

  return (
    <svg width={width} height={height} role="img" aria-label={`Distribution of ${featureKey}`}>
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke={T.ink} strokeOpacity="0.25" />
      {counts.map((c, i) => {
        const barH = maxCount ? (c / maxCount) * plotH : 0;
        const x = padL + i * barW;
        const y = height - padB - barH;
        return (
          <rect key={i} x={x + 0.5} y={y} width={Math.max(barW - 1, 1)} height={barH} fill={T.teal} opacity={0.32} />
        );
      })}
      {Array.from({ length: 11 }).map((_, i) => {
        const x = padL + (i / 10) * plotW;
        return (
          <line
            key={i}
            x1={x}
            y1={height - padB}
            x2={x}
            y2={height - padB + (i % 5 === 0 ? 7 : 4)}
            stroke={T.ink}
            strokeOpacity={i % 5 === 0 ? 0.5 : 0.25}
          />
        );
      })}
      <text x={padL} y={height - 4} fontSize="9" fill={T.slate} fontFamily="JetBrains Mono, monospace">
        {min.toFixed(2)}
      </text>
      <text x={width - padR} y={height - 4} fontSize="9" fill={T.slate} fontFamily="JetBrains Mono, monospace" textAnchor="end">
        {max.toFixed(2)}
      </text>
      {hasCmp && (
        <g>
          <line x1={xForValue(cmpVal)} y1={padT} x2={xForValue(cmpVal)} y2={height - padB} stroke={T.slate} strokeWidth="2" strokeDasharray="3,2" />
          <circle cx={xForValue(cmpVal)} cy={padT} r="3.5" fill={T.slate} />
        </g>
      )}
      {hasSel && (
        <g>
          <line x1={xForValue(selVal)} y1={padT} x2={xForValue(selVal)} y2={height - padB} stroke={T.brass} strokeWidth="2.5" />
          <circle cx={xForValue(selVal)} cy={padT} r="4.5" fill={T.brass} stroke={T.ink} strokeWidth="0.5" />
        </g>
      )}
    </svg>
  );
}
