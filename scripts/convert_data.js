// scripts/convert_data.js
//
// Converts your real data files into what the web app fetches at runtime:
//   data/annotated_df_11.csv               -> public/data/variants.json
//   data/PETbusters_zero_track_submission.csv  (merged in by row order)
//   data/pdb/<file>.pdb                    -> public/pdb/<file>.pdb (copied)
//
// Usage:
//   node scripts/convert_data.js
//
// Expects this layout (matches the report/ folder structure already in use):
//   report/data/annotated_df_11.csv
//   report/data/PETbusters_zero_track_submission.csv
//   report/data/pdb/*.pdb            <- put your ~4988 real PDB files here
//
// Run this from the project root (petase-explorer/), with report/ as a
// sibling or adjust DATA_DIR below to point at the real path.

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

// ---- EDIT THESE PATHS to match where your real files live ----
const DATA_DIR = path.resolve(PROJECT_ROOT, "../data");
const ANNOTATED_CSV = path.join(DATA_DIR, "annotated_df_11.csv");
const SUBMISSION_CSV = path.join(DATA_DIR, "PETbusters_zero_track_submission.csv");
const PDB_SOURCE_DIR = path.join(DATA_DIR, "pdb"); // expects one .pdb per variant
// -----------------------------------------------------------------

const OUT_DATA_DIR = path.resolve(PROJECT_ROOT, "public/data");
const OUT_PDB_DIR = path.resolve(PROJECT_ROOT, "public/pdb");

// ---------------------------------------------------------------------- //
// RFC 4180-aware CSV parser.
//
// WHY THIS EXISTS: an earlier version of this script split on raw newlines
// (`text.split(/\r?\n/)`), which silently breaks if any field contains an
// embedded newline inside a quoted value — several columns in
// annotated_df_11.csv hold Python list/dict reprs (e.g. `distances`,
// `per_residue_sap`, `pka_kamlesm`, `sasa`, `hydrophob`) that can be quoted
// and may wrap. That bug caused 4988 real rows to be miscounted as 34916
// raw lines (~7x) — same failure mode as `wc -l` on this file, which is
// NOT row-aware either. R's read.csv() / readr handle this correctly,
// which is why `nrow(df)` in R kept showing the right number (4988) even
// though `wc -l` and the old parser did not.
//
// This parser walks the file character by character, tracking whether
// we're inside a quoted field, and only treats a comma/newline as a
// delimiter when we're NOT inside quotes. Doubled quotes ("") inside a
// quoted field are unescaped to a single quote, per the CSV spec.
// ---------------------------------------------------------------------- //
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  const n = text.length;

  while (i < n) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      // skip; \n (or end) will terminate the row
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  // last field/row if file doesn't end with a trailing newline
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  // drop fully-empty trailing rows (common with a final trailing newline)
  while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }

  if (rows.length === 0) return [];
  const headers = rows[0];
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = cells[idx];
    });
    return obj;
  });
}

function toNumberOrNull(s) {
  if (s === undefined || s === "" || s === "NA" || s === "NaN") return null;
  const n = Number(s);
  return Number.isNaN(n) ? null : n;
}

function main() {
  if (!fs.existsSync(ANNOTATED_CSV)) {
    console.error(`Could not find ${ANNOTATED_CSV}`);
    console.error("Edit DATA_DIR at the top of scripts/convert_data.js to point at your report/data folder.");
    process.exit(1);
  }
  if (!fs.existsSync(SUBMISSION_CSV)) {
    console.error(`Could not find ${SUBMISSION_CSV}`);
    process.exit(1);
  }

  console.log("Reading", ANNOTATED_CSV);
  const annotated = parseCsv(fs.readFileSync(ANNOTATED_CSV, "utf8"));

  console.log("Reading", SUBMISSION_CSV);
  const submission = parseCsv(fs.readFileSync(SUBMISSION_CSV, "utf8"));

  console.log(`Parsed ${annotated.length} rows from annotated_df_11.csv, ${submission.length} rows from submission CSV.`);

  if (annotated.length !== submission.length) {
    console.warn(
      `Row count mismatch: annotated_df_11.csv has ${annotated.length} rows, ` +
        `submission has ${submission.length} rows. Merging by row index — ` +
        `double check this is the right join key (see the column_documentation.md ` +
        `note about annotated_df_10.csv vs _11.csv used for the real submission).`
    );
  }

  // Build the per-variant records the app actually needs. Extend this list
  // freely — every key you add here becomes available to FEATURES in
  // src/features.js and to the table/plots automatically.
  const variants = annotated.map((row, i) => {
    const sub = submission[i] || {};
    const id = `PB_${String(i + 1).padStart(4, "0")}`;
    const pdbFileName = `${id}.pdb`; // adjust if your real PDB filenames differ

    return {
      id,
      organism: row["organism"] || "unknown",
      sequence: sub["sequence"] || "",
      pdb_file: `pdb/${pdbFileName}`,

      // catalytic triad residue numbers, for active-site highlighting
      cat_S: toNumberOrNull(row["cat.S"]),
      cat_D: toNumberOrNull(row["cat.D"]),
      cat_H: toNumberOrNull(row["cat.H"]),

      // submission scores (the actual zero-shot predictions)
      activity_1: toNumberOrNull(sub["activity_1"]),
      activity_2: toNumberOrNull(sub["activity_2"]),
      expression: toNumberOrNull(sub["expression"]),

      // catalysis features used in scoring.ipynb
      cat_S_dist: toNumberOrNull(row["cat.S_dist"]),
      pet_msa_affinity: toNumberOrNull(row["pet_msa_affinity"]),
      weighted_hydrop_mean: toNumberOrNull(row["weighted_hydrop_mean"]),
      apo_msa_ptm: toNumberOrNull(row["apo_msa_ptm"]),
      pet_msa_iptm: toNumberOrNull(row["pet_msa_iptm"]),
      pet_msa_iplddt: toNumberOrNull(row["pet_msa_iplddt"]),
      as_protonation_score_ph9: toNumberOrNull(row["as_protonation_score_ph9"]),
      as_protonation_score_ph55: toNumberOrNull(row["as_protonation_score_ph55"]),
      net_relative_charge_5_5: toNumberOrNull(row["net_relative_charge_5.5"]),
      net_relative_charge_9: toNumberOrNull(row["net_relative_charge_9"]),

      // expression features used in scoring.ipynb
      sap: toNumberOrNull(row["sap"]),
      gravy: toNumberOrNull(row["gravy"]),
      instability: toNumberOrNull(row["instability"]),
      dG_score_per_res: toNumberOrNull(row["dG_score_per_res"]),
      soluprot: toNumberOrNull(row["soluprot"]),
      mbp_exp: toNumberOrNull(row["mbp_exp"]),

      // NOTE: placer_score is NOT a column in annotated_df_11.csv — it was
      // computed in a separate PLACER scoring run and merged into the final
      // score as a single factor. The converter currently leaves
      // placer_score: null for every variant. If you have that separate
      // PLACER scores file, add a merge step here before running this
      // script again.
      placer_score: null,
    };
  });

  fs.mkdirSync(OUT_DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DATA_DIR, "variants.json"), JSON.stringify(variants));
  console.log(`Wrote ${variants.length} variants to ${path.join(OUT_DATA_DIR, "variants.json")}`);

  // Copy PDB files if present. For ~5000 files this can be slow and makes
  // for a large git repo / GitHub Pages deploy — see the size note in the
  // README before committing all of them.
  if (fs.existsSync(PDB_SOURCE_DIR)) {
    fs.mkdirSync(OUT_PDB_DIR, { recursive: true });
    const files = fs.readdirSync(PDB_SOURCE_DIR).filter((f) => f.endsWith(".pdb"));
    console.log(`Copying ${files.length} PDB files from ${PDB_SOURCE_DIR} to ${OUT_PDB_DIR}...`);
    files.forEach((f) => {
      fs.copyFileSync(path.join(PDB_SOURCE_DIR, f), path.join(OUT_PDB_DIR, f));
    });
    console.log("Done copying PDB files.");
  } else {
    console.warn(
      `PDB source directory not found at ${PDB_SOURCE_DIR} — skipping PDB copy. ` +
        `The structure viewer will fail to load until real .pdb files are placed in public/pdb/.`
    );
  }
}

main();
