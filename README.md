# SEEA-AI — Natural-capital accounting from AI + remote sensing (reproducible repo)

**Repository:** https://github.com/ivilaruic/SEEA_AI

Accompanies Vilar Ramírez, González & Bastons Prat (2026), *SEEA-AI*, submitted to
**Ecosystem Services**. Calibrated on the Murray–Darling Basin (validated against
Smith et al., 2025) and transferred to the río Sinú (Colombia).

## Contents
```
gee/                         Google Earth Engine scripts (JavaScript)
  validation_murray.js       MDB 2018-19 vs Smith et al. 2025 (carbon, NPP, RUSLE, Hansen, MODIS)
  validation_sinu.js         Río Sinú full account 2020-2024 (tropical calibration + RADD)
  rf_biomass_mdb_to_sinu.js  Random Forest (NASA/ORNL labels): train MDB -> transfer Sinú
                             flag ADD_SINU_TRAINING = false (rf_false) / true (rf_true)
  sinu_change_2020_2024.js   Sinú change analysis (NDVI/NBR deltas, Hansen, RADD, MODIS)
python_pipeline/             Offline-reproducible Python implementation + figures
benchmark/
  BENCHMARK.md               Smith et al. 2025 reference values + SEEA-AI comparison
  CSIRO_DATA_LINKS.md        CSIRO Murray–Darling account-ready data (DOIs) to verify
data/mdb_boundary/README.md  Official MDBA perimeter: EE asset + download to reproduce
results/
  VALIDATION_RESULTS.md      All GEE console outputs (Murray, RF, Sinú)
  panel_*.png                Result maps used as figures in the article
```

## Earth Engine assets required
- `projects/seea-ai/assets/mdb_boundary`  (official MDBA perimeter — see data/mdb_boundary)
- Sinú AOI is derived in-script from HydroSHEDS `MAIN_BAS` (no upload needed).

## How to verify the calculations
1. Open each `gee/*.js` in the Earth Engine Code Editor and Run.
2. Compare console outputs with `results/VALIDATION_RESULTS.md`.
3. Compare per-unit values with `benchmark/BENCHMARK.md` (Smith et al., 2025) and,
   for the underlying CSIRO data, the DOIs in `benchmark/CSIRO_DATA_LINKS.md`.

## Key validated result
Random-Forest biomass model: **R² = 0.77, RMSE = 13.2 tC/ha** (held-out test,
NASA/ORNL labels). EO carbon sequestration **12.6 vs 9.9 tCO₂/ha·yr** (Smith 2025),
cross-verified by Landsat (Δ −0.048), Hansen and MODIS.

License: MIT (code) / CC-BY for cited CSIRO & MDBA data.
