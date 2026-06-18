// Column metadata surfaced in the Feature Inspector.
// Drawn from the project's column_documentation.md — keep these two files
// in sync if you add/rename columns in the underlying CSVs.
const num = (decimals) => (v) => v == null ? "n/a" : v.toFixed(decimals);

export const FEATURES = [
  { key: "activity_1", label: "Catalysis score, pH 5.5", group: "Submission score", higher: "better", fmt: num(3), desc: "Zero-shot catalysis score at pH 5.5, combining PLACER preorganization, Boltz-2 affinity/hydrophobicity, catalytic-Ser distance, and pH-specific protonation/isoelectric terms." },
  { key: "activity_2", label: "Catalysis score, pH 9", group: "Submission score", higher: "better", fmt: num(3), desc: "Same formula as pH 5.5, using the pH-9 protonation and isoelectric terms instead." },
  { key: "expression", label: "Expression score", group: "Submission score", higher: "better", fmt: num(3), desc: "Predicted soluble-expression likelihood, combining stability, SAP aggregation propensity, GRAVY, instability index, SoluProt, and MBP-EXP." },
  { key: "placer_score", label: "PLACER preorganization", group: "Catalysis features", higher: "better", fmt: num(3), desc: "Active-site preorganization score from PLACER conformational sampling, computed in a separate pipeline run and merged in as a single factor." },
  { key: "cat_S_dist", label: "Cat. Ser to scissile bond distance (Å)", group: "Catalysis features", higher: "lower", fmt: (v) => (v == null || v === -1 ? "n/a" : v.toFixed(2) + " Å"), desc: "Distance from the catalytic serine to the scissile ester bond — a geometric proxy for nucleophilic attack feasibility. −1 is a sentinel for 'no catalytic Ser found'." },
  { key: "pet_msa_affinity", label: "Boltz-2 PET affinity", group: "Catalysis features", higher: "lower", fmt: num(3), desc: "Predicted binding affinity for the PET-substrate complex (Boltz-2, MSA mode). More negative is treated as tighter/more favorable binding." },
  { key: "weighted_hydrop_mean", label: "Weighted hydrophobicity (active site)", group: "Catalysis features", higher: "context", fmt: num(2), desc: "SASA-weighted mean hydrophobicity of active-site-proximal residues — exposed hydrophobic surface near the catalytic pocket." },
  { key: "apo_msa_ptm", label: "Apo structure pTM", group: "Structure confidence", higher: "better", fmt: num(3), desc: "Boltz-2 predicted TM-score for the apoprotein structure (MSA mode) — global fold confidence." },
  { key: "pet_msa_iptm", label: "Holo interface ipTM", group: "Structure confidence", higher: "better", fmt: num(3), desc: "Boltz-2 predicted interface TM-score for the PET-bound complex — confidence in the substrate-binding interface specifically." },
  { key: "as_protonation_score_ph9", label: "Active-site protonation, pH 9", group: "Electrostatics", higher: "context", fmt: num(3), desc: "KaML-ESM-derived protonation score of the active site at pH 9." },
  { key: "sap", label: "Spatial Aggregation Propensity", group: "Expression features", higher: "lower", fmt: num(1), desc: "Rosetta SAP score — whole-protein aggregation-propensity estimate. Lower is more soluble." },
  { key: "gravy", label: "GRAVY hydrophobicity", group: "Expression features", higher: "lower", fmt: num(3), desc: "Kyte–Doolittle GRAVY score over the full sequence. More negative suggests better solubility." },
  { key: "instability", label: "Instability index", group: "Expression features", higher: "lower", fmt: num(1), desc: "Guruprasad instability index. Values above ~40 are classically considered unstable." },
  { key: "dG_score_per_res", label: "ΔG per residue", group: "Expression features", higher: "lower", fmt: num(3), desc: "Rosetta ΔG normalized by sequence length. More negative indicates a more stable fold." },
  { key: "soluprot", label: "SoluProt score", group: "Expression features", higher: "better", fmt: num(3), desc: "Gradient-boosting model's predicted probability of soluble expression in E. coli." },
  { key: "mbp_exp", label: "MBP-EXP score", group: "Expression features", higher: "better", fmt: num(3), desc: "Sequence-embedding MLP prediction of E. coli expression probability." },
];

export const FEATURE_GROUPS = [...new Set(FEATURES.map((f) => f.group))];
