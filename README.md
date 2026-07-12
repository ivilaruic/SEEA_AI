# SEEA-AI — Natural-capital accounting from AI + remote sensing (reproducible repo)

**Repository:** https://github.com/ivilaruic/SEEA_AI

Accompanies Vilar Ramírez, González & Bastons Prat (2026), *SEEA-AI*, submitted to
**Ecosystem Services**. Calibrated on the Murray–Darling Basin (validated against
Smith et al., 2025) and transferred to two independent application basins: the
río Sinú (Colombia) and Alto Madre de Dios (Peru).

## Contents
```
gee/                              Google Earth Engine scripts (JavaScript)
  validation_murray.js            MDB 2018-19 vs Smith et al. 2025 (carbon, NPP, RUSLE, Hansen, MODIS)
  validation_sinu.js              Río Sinú full account 2020-2024 (tropical calibration + RADD)
  rf_biomass_mdb_to_sinu.js       Random Forest (NASA/ORNL labels): train MDB -> transfer Sinú
                                   flag ADD_SINU_TRAINING = false (rf_false) / true (rf_true)
  sinu_change_2020_2024.js        Sinú change analysis (NDVI/NBR deltas, Hansen, RADD, MODIS)
  validation_madre_de_dios.js     Alto Madre de Dios full account 2020-2024 (Amazon tributary,
                                   Pfafstetter-prefix AOI, tropical calibration + RADD)
  rf_biomass_mdb_to_madrededios.js  Random Forest (NASA/ORNL labels): train MDB -> transfer
                                   Alto Madre de Dios; same flag convention,
                                   ADD_MDD_TRAINING = false / true
python_pipeline/                  Offline-reproducible Python implementation + figures
benchmark/
  BENCHMARK.md                    Smith et al. 2025 reference values + SEEA-AI comparison (Murray-Darling)
  CSIRO_DATA_LINKS.md             CSIRO Murray–Darling account-ready data (DOIs) to verify
data/mdb_boundary/README.md       Official MDBA perimeter: EE asset + download to reproduce
results/
  VALIDATION_RESULTS.md           All GEE console outputs (Murray, RF, Sinú, Alto Madre de Dios)
  panel_*.png                     Result maps used as figures in the article (Murray/Sinú/Madre de Dios)
```

## Earth Engine assets required
- `projects/seea-ai/assets/mdb_boundary`  (official MDBA perimeter — see data/mdb_boundary)
- Sinú AOI is derived in-script from HydroSHEDS `MAIN_BAS` (no upload needed).
- Alto Madre de Dios AOI is derived in-script from HydroSHEDS `hybas_8` via
  Pfafstetter-code (`PFAF_ID`) prefix match (no upload needed) — required because
  Madre de Dios is an Amazon tributary, so the simpler `MAIN_BAS` grouping used
  for the standalone Sinú basin would instead select the entire upstream Amazon
  drainage network. See the `FIX` comments at the top of
  `validation_madre_de_dios.js` and `rf_biomass_mdb_to_madrededios.js`.

## How to verify the calculations
1. Open each `gee/*.js` in the Earth Engine Code Editor and Run.
2. Compare console outputs with `results/VALIDATION_RESULTS.md`.
3. Compare per-unit values with `benchmark/BENCHMARK.md` (Smith et al., 2025) and,
   for the underlying CSIRO data, the DOIs in `benchmark/CSIRO_DATA_LINKS.md`.
   (Smith et al. 2025 is the reference/calibration basin only; Sinú and Alto
   Madre de Dios are independent application basins with no external
   published benchmark — they are cross-verified internally via Landsat,
   Hansen, RADD and MODIS, as detailed in `VALIDATION_RESULTS.md`.)

## Key validated results
Random-Forest biomass model: **R² = 0.77, RMSE = 13.2 tC/ha** (held-out test,
NASA/ORNL labels), unchanged across both transfer targets (Sinú and Alto Madre
de Dios). EO carbon sequestration **12.6 vs 9.9 tCO₂/ha·yr** (Smith 2025),
cross-verified by Landsat (Δ −0.048), Hansen and MODIS.

- **Sinú** (14,065 km²): net basin greening (ΔC +11.2%), 14,580 ha Hansen loss,
  localized carbon-stock loss ≈47 M USD (sensitivity 32–66 M USD).
- **Alto Madre de Dios** (35,183 km²): 57,141 ha Hansen loss, 148,930 ha RADD
  alerts concentrated in the mining corridor, ΔAGB +4.3 tCO₂/ha basin-wide,
  localized carbon-stock loss ≈586 M USD (sensitivity 446–737 M USD).

License: MIT (code) / CC-BY for cited CSIRO & MDBA data.
