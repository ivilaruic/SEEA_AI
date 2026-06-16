# Reproducibility guide

## Software environment (Python pipeline)
    conda env create -f environment.yml   # or: pip install -r requirements.txt
    conda activate seea-ai

## Earth Engine (primary results)
1. An EE account (code.earthengine.google.com). Cloud project: `seea-ai`.
2. Asset required: `projects/seea-ai/assets/mdb_boundary` (see data/mdb_boundary).
3. Run, in order, the scripts in `gee/`:
   - `validation_murray.js`   → Murray–Darling 2018-19 vs Smith et al. 2025
   - `rf_biomass_mdb_to_sinu.js` (set ADD_SINU_TRAINING=true for Sinú values)
   - `validation_sinu.js`     → río Sinú dry-season composites 2019-20 / 2023-24
4. Compare the console with `results/VALIDATION_RESULTS.md` (verifiable table).

## Caveats baked into the analysis (read before citing numbers)
- **Periods are dry-season composites** (Dec–Mar), not calendar years.
- **NPP ≠ net sequestration**: MODIS NPP is gross primary productivity potential.
- **AGB (NASA/ORNL) is a 2010 global baseline** (300 m): a *relative* approximation,
  not an absolute annual carbon inventory. ESA CCI Biomass is a temporal alternative.
- **RF**: R²=0.77 but RMSE=13.2 tC/ha (≈48.4 tCO₂/ha) → strong for relative/spatial
  contrast, weak as absolute financial inventory. Random pixel split → optimistic
  (no spatial-block CV yet).
- **Murray–Darling is a methodological-coherence benchmark**, not a direct empirical
  validation of the tropical Sinú application.
- **47 M USD = one-off localized carbon-stock loss** (deforestation), NOT an annual
  flow → not capitalized (sensitivity 32–66 M USD).
- **Soil carbon** is not retrievable from Sentinel (use SoilGrids/SLGA).

## Suggested release
Tag `v1.0-paper-submission` and archive on Zenodo for a citable DOI; add the DOI here.
