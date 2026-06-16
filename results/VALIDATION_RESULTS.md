# Validation results (verifiable table)

**Reproducibility metadata** — Earth Engine (code.earthengine.google.com), interactive
console. Re-run the scripts in `gee/` to regenerate. Record your own run date and the
commit hash (`git rev-parse --short HEAD`) when you export.

| Run date | EE platform | Commit | Notes |
|---|---|---|---|
| _fill on run_ | GEE Code Editor | _git short hash_ | dry-season composites (Dec–Mar) |

## Murray–Darling — validation_murray.js (AOI: projects/seea-ai/assets/mdb_boundary)
| Variable | Value | Unit | Scale | Date window | Source |
|---|---|---|---|---|---|
| Basin area | 1,059,394 | km² | — | — | MDBA Water Act 2007 |
| S2 scenes | 3,354 | count | — | 2018-12-01/2019-02-28 | S2_SR_HARMONIZED |
| NDVI mean | 0.229 | – | 500 m | summer 2018-19 | Sentinel-2 |
| Condition C | 0.274 | 0–1 | 500 m | summer 2018-19 | Sentinel-2 (ref 0.70) |
| Landsat NDVI | 0.277 | – | 500 m | summer 2018-19 | LС08 (Δ=−0.048) |
| AGB carbon | 48.0 | tCO₂/ha | 300 m | 2010 baseline | NASA/ORNL |
| NPP (primary prod.) | 12.6 | tCO₂/ha·yr | 500 m | 2018 | MODIS MOD17A3HGF |
| Soil-loss proxy (RUSLE) | 0.63 | t/ha·yr | 1000 m | FY 2018-19 | CHIRPS+SRTM+NDVI |
| Hansen forest loss | 524,266 | ha | 30 m | 2018-19 | UMD Hansen GFC v1.12 |
| MODIS burned | 193,105 | ha | 500 m | FY 2018-19 | MCD64A1 |

## Random Forest — rf_biomass_mdb_to_sinu.js (label: NASA/ORNL agb, 2010, 300 m)
| Variable | Value | Unit | Notes |
|---|---|---|---|
| Train / test n | 5,035 / 829 | count | 70/30, random pixel split |
| Predictors | 12 | – | B2-B12, NDVI, NDWI, NBR, elev, slope, precip |
| R² (test, MDB) | 0.77 | – | held-out |
| RMSE | 13.2 | tC/ha | ≈ 48.4 tCO₂/ha |
| MDB mean (RF) | 14.6 | tC/ha | =53.5 tCO₂/ha (ref NASA/ORNL 13.1 tC/ha) |
| Sinú 2020 / 2024 (true) | 132.3 / 139.7 | tCO₂/ha | ADD_SINU_TRAINING=true |
| ΔAGB Sinú | +8.9 | tCO₂/ha | relative change |

## Río Sinú — validation_sinu.js (AOI: HydroBASINS MAIN_BAS, full basin)
| Variable | Value | Unit | Scale | Date window | Source |
|---|---|---|---|---|---|
| Basin area | 14,065 | km² | — | — | HydroSHEDS hybas_7 MAIN_BAS |
| NDVI 2020 / 2024 | 0.563 / 0.622 | – | 300 m | dry-season 2019-20 / 2023-24 | Sentinel-2 |
| Condition C 2020 / 2024 | 0.642 / 0.714 | 0–1 | 300 m | dry season | Sentinel-2 (ref 0.85) |
| Landsat NDVI 2024 | 0.655 | – | 500 m | dry 2023-24 | LС08 (Δ=−0.033) |
| NPP 2020 / 2023 | 23.2 / 20.8 | tCO₂/ha·yr | 500 m | annual | MODIS MOD17A3HGF |
| Soil-loss proxy | 0.45 | t/ha·yr | 1000 m | 2023-24 | CHIRPS+SRTM+NDVI |
| Hansen forest loss | 14,580 | ha | 30 m | 2020-2024 | UMD Hansen GFC v1.12 |
| RADD alerts | 5,605 | ha | 30 m | 2020-2024 | WUR RADD (Sentinel-1) |
| MODIS burned | 3,246 | ha | 500 m | 2020-2024 | MCD64A1 |

## Economic interpretation (paper §4.5–4.8, §4.17)
Net basin greening (ΔNDVI +0.059; ΔC +0.072 = +11.2%; ΔAGB +8.9 tCO₂/ha) WITH
localized forest loss. **One-off** carbon-stock loss in deforested hotspots:
14,580 ha × ~130 tCO₂/ha ≈ 1.90 MtCO₂ → at 25 USD/tCO₂ ≈ **47 M USD**
(sensitivity 32–66 M USD; NOT an annual flow → not capitalized).

> NPP ≠ net sequestration. AGB is a relative approximation calibrated to the 2010
> NASA/ORNL baseline, not an absolute annual carbon inventory.
