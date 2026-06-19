#!/usr/bin/env python3
"""Merge PLACER scores and catalytic triad positions into variants.json.

Output files:
  public/data/variants.json  — lean main file (floats rounded, no sap_arr)
  public/data/sap_data.json  — {variant_id: [sap_arr...]} loaded lazily
"""
import csv
import json
import ast
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VARIANTS_JSON = os.path.join(ROOT, "public/data/variants.json")
SAP_JSON = os.path.join(ROOT, "public/data/sap_data.json")
PLACER_CSV = "/Users/benjaminwehnert/align_competition/report/data/PLACER_score_df.csv"
ANNOTATED_CSV = "/Users/benjaminwehnert/align_competition/report/data/annotated_df_11.csv"
SAP_SCALE = 10  # store SAP×10 as integer (0-255)

# Columns NOT needed by the app (redundant or unused by features.js/UI)
DROP_KEYS = {"as_filddisco_positions", "placer_prefactor",
             "as_protonation_score_ph55", "net_relative_charge_5_5",
             "net_relative_charge_9", "sap_arr"}

def round_floats(obj, decimals=4):
    if isinstance(obj, float):
        return round(obj, decimals)
    if isinstance(obj, dict):
        return {k: round_floats(v, decimals) for k, v in obj.items()}
    if isinstance(obj, list):
        return [round_floats(v, decimals) for v in obj]
    return obj

# ── PLACER scores (keyed by Variant_ID) ─────────────────────────────────────
placer = {}
with open(PLACER_CSV) as f:
    for row in csv.DictReader(f):
        vid = int(row["Variant_ID"])
        placer[vid] = {
            "placer_score": float(row["Final_Score_equal-weights"]),
            "hbond_freq": float(row["Hbond_freq"]),
            "rmsd_apo_vs_aei_z": float(row["RMSD_Apo_vs_Aei_z"]),
            "delta_rmsf_aei_apo_z": float(row["delta_RMSF_Aei_Apo_z"]),
            "aei_stdev_rmsd_z": float(row["Aei_stdev_rmsd_z"]),
        }
print(f"Loaded {len(placer)} PLACER rows")

# ── Annotated CSV (row index = variant index) ────────────────────────────────
annotated = []
with open(ANNOTATED_CSV) as f:
    for row in csv.DictReader(f):
        def maybe_int(val):
            try:
                return int(float(val)) if val.strip() else None
            except Exception:
                return None

        sap_arr = None
        sap_raw = row.get("per_residue_sap", "").strip()
        try:
            sap_dict = ast.literal_eval(sap_raw) if sap_raw else {}
            if sap_dict:
                max_key = max(sap_dict.keys())
                sap_arr = [
                    min(255, round(sap_dict.get(k, 0) * SAP_SCALE))
                    for k in range(1, max_key + 1)
                ]
        except Exception:
            pass

        annotated.append({
            "cat_S": maybe_int(row.get("cat-S", "")),
            "cat_D": maybe_int(row.get("cat-D", "")),
            "cat_H": maybe_int(row.get("cat-H", "")),
            "sap_arr": sap_arr,
        })
print(f"Loaded {len(annotated)} annotated rows")

# ── Load and update variants ─────────────────────────────────────────────────
with open(VARIANTS_JSON) as f:
    variants = json.load(f)
print(f"Loaded {len(variants)} variants")

sap_data = {}
merged = 0
for i, v in enumerate(variants):
    # Annotated data (triad positions + SAP)
    if i < len(annotated):
        ann = annotated[i]
        v["cat_S"] = ann["cat_S"]
        v["cat_D"] = ann["cat_D"]
        v["cat_H"] = ann["cat_H"]
        if ann["sap_arr"]:
            sap_data[v["id"]] = ann["sap_arr"]

    # PLACER scores
    if i in placer:
        p = placer[i]
        v["placer_score"] = p["placer_score"]
        v["hbond_freq"] = p["hbond_freq"]
        v["rmsd_apo_vs_aei_z"] = p["rmsd_apo_vs_aei_z"]
        v["delta_rmsf_aei_apo_z"] = p["delta_rmsf_aei_apo_z"]
        v["aei_stdev_rmsd_z"] = p["aei_stdev_rmsd_z"]
        merged += 1

    # Remove unused/redundant columns
    for key in DROP_KEYS:
        v.pop(key, None)

    # Round all floats to 4 decimal places
    for key, val in v.items():
        if isinstance(val, float):
            v[key] = round(val, 4)

print(f"Merged PLACER scores for {merged} variants")
print(f"Collected SAP data for {len(sap_data)} variants")

v0 = variants[0]
print(f"Variant 0: cat_S={v0['cat_S']}, cat_D={v0['cat_D']}, cat_H={v0['cat_H']}, "
      f"placer_score={v0.get('placer_score')}")
print(f"Keys per variant: {list(v0.keys())}")

with open(VARIANTS_JSON, "w") as f:
    json.dump(variants, f, separators=(",", ":"))
print(f"Written {VARIANTS_JSON}")

with open(SAP_JSON, "w") as f:
    json.dump(sap_data, f, separators=(",", ":"))
print(f"Written {SAP_JSON}")
