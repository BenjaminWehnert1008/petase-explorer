#!/usr/bin/env python3
"""Merge PLACER scores and catalytic triad positions into variants.json."""
import csv
import json
import ast
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANTS_JSON = os.path.join(ROOT, "public/data/variants.json")
PLACER_CSV = "/Users/benjaminwehnert/align_competition/report/data/PLACER_score_df.csv"
ANNOTATED_CSV = "/Users/benjaminwehnert/align_competition/report/data/annotated_df_11.csv"

# Load PLACER scores keyed by Variant_ID
placer = {}
with open(PLACER_CSV) as f:
    for row in csv.DictReader(f):
        vid = int(row["Variant_ID"])
        placer[vid] = {
            "placer_score": float(row["Final_Score_equal-weights"]),
            "placer_prefactor": float(row["PLACER_prefactor"]),
            "hbond_freq": float(row["Hbond_freq"]),
            "rmsd_apo_vs_aei_z": float(row["RMSD_Apo_vs_Aei_z"]),
            "delta_rmsf_aei_apo_z": float(row["delta_RMSF_Aei_Apo_z"]),
            "aei_stdev_rmsd_z": float(row["Aei_stdev_rmsd_z"]),
        }

print(f"Loaded {len(placer)} PLACER rows")

# Load catalytic triad positions from annotated CSV (row index = variant index)
annotated = []
with open(ANNOTATED_CSV) as f:
    for row in csv.DictReader(f):
        pos_raw = row.get("as_filddisco_positions", "").strip()
        try:
            pos = ast.literal_eval(pos_raw) if pos_raw else None
        except Exception:
            pos = None

        def maybe_int(v):
            try:
                return int(float(v)) if v.strip() else None
            except Exception:
                return None

        annotated.append({
            "cat_S": maybe_int(row.get("cat-S", "")),
            "cat_D": maybe_int(row.get("cat-D", "")),
            "cat_H": maybe_int(row.get("cat-H", "")),
            "as_filddisco_positions": pos,
        })

print(f"Loaded {len(annotated)} annotated rows")

# Load and update variants.json
with open(VARIANTS_JSON) as f:
    variants = json.load(f)

print(f"Loaded {len(variants)} variants")

merged = 0
for i, v in enumerate(variants):
    # Annotated CSV is in same order as variants (0-indexed)
    if i < len(annotated):
        ann = annotated[i]
        v["cat_S"] = ann["cat_S"]
        v["cat_D"] = ann["cat_D"]
        v["cat_H"] = ann["cat_H"]
        v["as_filddisco_positions"] = ann["as_filddisco_positions"]

    # PLACER CSV uses Variant_ID 0-indexed
    if i in placer:
        p = placer[i]
        v["placer_score"] = p["placer_score"]
        v["placer_prefactor"] = p["placer_prefactor"]
        v["hbond_freq"] = p["hbond_freq"]
        v["rmsd_apo_vs_aei_z"] = p["rmsd_apo_vs_aei_z"]
        v["delta_rmsf_aei_apo_z"] = p["delta_rmsf_aei_apo_z"]
        v["aei_stdev_rmsd_z"] = p["aei_stdev_rmsd_z"]
        merged += 1

print(f"Merged PLACER scores for {merged} variants")

# Verify sample
v0 = variants[0]
print(f"Variant 0: cat_S={v0['cat_S']}, cat_D={v0['cat_D']}, cat_H={v0['cat_H']}, "
      f"as_filddisco_positions={v0.get('as_filddisco_positions')}, placer_score={v0['placer_score']:.3f}")

with open(VARIANTS_JSON, "w") as f:
    json.dump(variants, f, separators=(",", ":"))

print(f"Written {VARIANTS_JSON}")
