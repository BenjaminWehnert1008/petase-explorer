// percentileOf: where does `value` rank among `allValues` (0-100)?
// -1 sentinels and NaN are excluded from the ranking population.
export function percentileOf(value, allValues) {
  const valid = allValues.filter((v) => v !== -1 && !Number.isNaN(v));
  if (!valid.length) return null;
  const sorted = [...valid].sort((a, b) => a - b);
  let idx = sorted.findIndex((v) => v >= value);
  if (idx === -1) idx = sorted.length;
  return Math.round((idx / sorted.length) * 100);
}

// useInjectedScript: loads an external <script src=...> exactly once and
// reports when it's ready, used here to lazy-load 3Dmol.js from a CDN
// instead of bundling it (keeps the build small).
import { useState, useEffect } from "react";

export function useInjectedScript(src, globalCheck) {
  const [ready, setReady] = useState(() => !!globalCheck());
  useEffect(() => {
    if (ready) return;
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => setReady(true));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => setReady(true);
    document.body.appendChild(s);
  }, [ready, src]);
  return ready;
}
