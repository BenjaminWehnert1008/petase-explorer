# PETase Variant Explorer

Interactive browser for PETbusters zero-shot-track variant predictions:
scores, computational features, distributions, and 3D structures.

Ships with **60 synthetic placeholder variants** (distribution-matched to
the real dataset) so the app runs immediately. Swap in your real
~4988-variant data following Section 3 below.

---

## 1. Install and run locally

Requires [Node.js](https://nodejs.org) 18+ (includes `npm`).

```bash
cd petase-explorer       # this folder
npm install               # downloads React, Vite, etc. into node_modules/
npm run dev                # starts a local dev server
```

Terminal will print a local URL, typically `http://localhost:5173/`. Open
it in a browser.

**What to check works:**
- [ ] Variant table loads on the left with 60 rows
- [ ] Clicking a row updates the right-hand panel (scores, structure, sequence)
- [ ] The 3D structure loads and you can drag to rotate, scroll to zoom
- [ ] Toggling "highlight catalytic triad" shows/hides three gold spheres
- [ ] Clicking a feature name in "Feature inspector" updates the histogram
      on the right, with a gold marker at the selected variant's value
- [ ] "compare" button on a row, then selecting another variant, shows a
      second (gray, dashed) marker on the histogram and a side-by-side table
- [ ] Search box filters by ID or organism substring
- [ ] The two sliders filter the table by minimum score
- [ ] "export CSV" downloads a CSV of the currently filtered rows
- [ ] "dark mode" button toggles the color theme

If all of that works, the app itself is sound — anything broken after
wiring in real data (next sections) is a data-shape issue, not an app bug.

To stop the dev server: `Ctrl+C` in the terminal.

---

## 2. Build the production bundle (optional local check)

```bash
npm run build      # outputs static files into dist/
npm run preview    # serves dist/ locally so you can sanity-check the build
```

`npm run preview` prints another local URL — open it and re-run the same
checklist as Section 1. This step isn't required before deploying (GitHub
Actions does the build for you, see Section 4), but it's a fast way to
catch build errors before pushing.

---

## 3. Wire in your real data

### 3a. Variant data (CSV → JSON)

`scripts/convert_data.js` reads your two real CSVs and writes
`public/data/variants.json`, which is what the deployed app actually fetches.

> **If you hit a row-count mismatch warning that doesn't match `nrow()` in R:**
> an earlier version of this script split the CSV on raw newlines, which
> breaks if any field contains an embedded newline inside a quoted value —
> several columns in `annotated_df_11.csv` hold Python list/dict reprs
> (`distances`, `per_residue_sap`, `pka_kamlesm`, `sasa`, `hydrophob`) that
> can wrap across lines when quoted. That bug inflated the apparent row
> count (e.g. 4988 real rows counted as ~34916 "rows" — the same way
> `wc -l` miscounts this file, since neither is CSV-quote-aware). The
> parser now included in `scripts/convert_data.js` is a proper RFC
> 4180-aware parser (tracks quote state character-by-character) and has
> been tested against embedded newlines, embedded commas, escaped quotes,
> and CRLF line endings — `nrow()` in R and this script should now always
> agree. If you still see a mismatch after this fix, it's a genuine
> difference in the two files' row counts, not a parsing artifact — worth
> investigating which rows are missing/extra.

1. Open `scripts/convert_data.js` and check the `DATA_DIR` constant near the
   top — by default it points at `../report/data` (i.e. it expects this
   project folder to sit next to your existing `report/` folder). Adjust if
   your layout differs:

   ```js
   const DATA_DIR = path.resolve(PROJECT_ROOT, "../report/data");
   ```

2. Make sure these two files exist at that path:
   - `annotated_df_11.csv`
   - `PETbusters_zero_track_submission.csv`

3. Run the converter:

   ```bash
   npm run convert-data
   ```

   This overwrites `public/data/variants.json` with your real 4988 rows. It
   also prints a warning if the two CSVs don't have the same row count —
   read that warning, since the two source files are merged by row position,
   not by an explicit ID column (matching how `scoring.ipynb` does it).

4. **Important — PLACER score is not in `annotated_df_11.csv`.** Per your
   note, PLACER was scored in a separate run and merged into the final score
   as a single `placer_score` factor. The converter currently leaves
   `placer_score: null` for every variant. If you have that separate PLACER
   scores file, open `scripts/convert_data.js` and add a merge step (look
   for the `placer_score: null` line and the comment above it) before
   running the converter again.

5. Re-run `npm run dev` (or `npm run build`) to see the real data.

### 3b. Structure files (PDB)

The app expects one `.pdb` file per variant at `public/pdb/<id>.pdb`, where
`<id>` matches the `id` field generated in `variants.json` (`PB_0001`,
`PB_0002`, ... by row order).

**Option A — let the converter copy them for you:**
Put all your real PDB files into `report/data/pdb/` (or wherever
`PDB_SOURCE_DIR` points in `scripts/convert_data.js`), named so they sort in
the same row order as the CSVs, then re-run `npm run convert-data` — it
copies them into `public/pdb/` and renames nothing (so naming must already
match `PB_0001.pdb`, `PB_0002.pdb`, etc. — adjust the script's renaming
logic if your real filenames differ).

**Option B — copy manually:**

```bash
cp /path/to/your/real/pdbs/*.pdb public/pdb/
```

Just make sure the filenames match what's in `variants.json`'s `pdb_file`
field exactly (open the file and check a few entries if unsure).

> **Size warning:** ~4988 PDB files will likely add up to a sizeable
> repository (depends on your structures' atom count — CA-only traces are
> small, full-atom structures are not). GitHub has a 1 GB *soft* repo-size
> guidance and a 100 MB *hard* per-file limit. If your real structures are
> large:
> - Check total size first: `du -sh public/pdb/`
> - If it's too big for a normal git push, look into [Git LFS](https://git-lfs.com/)
>   for the `public/pdb/*.pdb` files, or host structures externally (e.g. a
>   separate static file host / S3 bucket) and point `pdb_file` at full URLs
>   instead of local paths.

---

## 4. Push to GitHub and deploy to GitHub Pages

### One-time repo setup

1. Create a new **empty** repository on GitHub (no README/license/gitignore
   — you already have those here). Name it, e.g., `petase-explorer`.

2. **Check `vite.config.js`** — the `base` field must exactly match your
   repo name:

   ```js
   base: "/petase-explorer/",
   ```

   If you name your GitHub repo something else, change this to match
   (`/your-repo-name/`, with both slashes). If you skip this step the
   deployed site will load a blank page with 404s in the browser console
   for all JS/CSS/data files.

3. From inside this project folder:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: PETase variant explorer"
   git branch -M main
   git remote add origin https://github.com/<your-username>/petase-explorer.git
   git push -u origin main
   ```

   Replace `<your-username>` and the repo name with your actual values.

### Enable GitHub Pages (one-time)

1. On GitHub, go to your repo → **Settings** → **Pages** (left sidebar).
2. Under "Build and deployment" → **Source**, select **GitHub Actions**
   (not "Deploy from a branch").
3. That's it — no further manual steps. The workflow file already in this
   repo (`.github/workflows/deploy.yml`) builds and deploys automatically
   on every push to `main`.

### Check the deploy worked

1. Go to the **Actions** tab on your repo. You should see a workflow run
   ("Deploy to GitHub Pages") — wait for both its jobs (`build`, `deploy`)
   to show green checkmarks. First run typically takes 1–3 minutes.
2. Go back to **Settings → Pages** — there should now be a message like
   "Your site is live at `https://<your-username>.github.io/petase-explorer/`"
   with a link.
3. Open that URL. Run through the same checklist as Section 1.

### Pushing updates later

Any time you want to update the live site (new data, code changes):

```bash
git add .
git commit -m "describe what changed"
git push
```

The Actions workflow re-runs automatically and the live site updates within
a couple of minutes — no other steps needed.

---

## 5. What to actually push to GitHub

Push **the whole project folder** (this is what `git add .` does, respecting
`.gitignore`). Concretely, that means:

```
petase-explorer/
├── .github/workflows/deploy.yml   ← required for auto-deploy
├── .gitignore
├── README.md
├── index.html
├── package.json
├── vite.config.js
├── public/
│   ├── data/variants.json         ← your real converted data (or sample)
│   └── pdb/*.pdb                  ← your real structures (or sample)
├── scripts/
│   └── convert_data.js
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── theme.js
    ├── features.js
    ├── utils.js
    ├── useVariantData.js
    └── components/
        ├── DistributionPlot.jsx
        ├── ScoreGauge.jsx
        ├── SequenceStrip.jsx
        ├── StructureViewer.jsx
        ├── TickRuler.jsx
        └── VariantRow.jsx
```

**Do not** push `node_modules/` or `dist/` — both are already excluded via
`.gitignore`, and GitHub Actions regenerates them on every deploy from
`package.json` and your source files.

---

## 6. Known prototype limitations (next steps)

- **Distribution plots are plain SVG**, not Plotly.js. They support the same
  highlighted-marker behavior but not pan/zoom/hover tooltips. See the
  comment at the top of `src/components/DistributionPlot.jsx` for the swap
  path if you want full Plotly interactivity later.
- **`placer_score` is not wired up** to real data yet (see Section 3a,
  point 4) — currently `null` for every variant until you merge in the
  separate PLACER scoring output.
- **No clustering / multi-variant overlay views yet** — the brief mentioned
  these as later extensions; the component structure (separate
  `DistributionPlot`, `useVariantData` hook, `FEATURES` metadata list) is
  meant to make adding them straightforward without restructuring the app.
- **CSV parser in `convert_data.js`** is a dependency-free RFC 4180-aware
  parser (handles quoted fields, embedded commas, embedded newlines, escaped
  quotes, and CRLF line endings). It does not handle more exotic CSV dialects
  (e.g. non-comma delimiters) — swap in a real CSV library
  (`npm install csv-parse`) if that's ever needed.
