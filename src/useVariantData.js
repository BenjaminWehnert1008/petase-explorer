import { useState, useEffect } from "react";

// useVariantData: fetches the converted dataset from /data/variants.json
// at runtime (produced by scripts/convert_data.js from your two CSVs).
// This is what makes the deployed site use your real 4988 variants instead
// of the bundled prototype sample — nothing about the data is baked into
// the JS bundle itself. Per-variant PDB structures are fetched separately,
// on demand, by StructureViewer (see fetchPdbText below).
export function useVariantData() {
  const [variants, setVariants] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    fetch(import.meta.env.BASE_URL + "data/variants.json")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load data/variants.json (" + r.status + ")");
        return r.json();
      })
      .then((v) => {
        if (!cancelled) setVariants(v);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { variants, error };
}

// fetchPdbText: fetches the raw PDB file text for a given variant id.
export async function fetchPdbText(pdbFile) {
  const res = await fetch(import.meta.env.BASE_URL + pdbFile);
  if (!res.ok) throw new Error("Failed to load " + pdbFile + " (" + res.status + ")");
  return res.text();
}

// fetchSapData: lazy-loads per-residue SAP arrays ({variant_id: [int...]}).
// Kept separate from variants.json to keep initial load fast (~4 MB vs ~7 MB).
export async function fetchSapData() {
  const res = await fetch(import.meta.env.BASE_URL + "data/sap_data.json");
  if (!res.ok) throw new Error("sap_data.json " + res.status);
  return res.json();
}
