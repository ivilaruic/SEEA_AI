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

## Economic interpretation (Sinú) — paper §4.5–4.8
Net basin greening (ΔNDVI +0.059; ΔC +0.072 = +11.2%; ΔAGB +8.9 tCO₂/ha) WITH
localized forest loss. **One-off** carbon-stock loss in deforested hotspots:
14,580 ha × ~130 tCO₂/ha ≈ 1.90 MtCO₂ → at 25 USD/tCO₂ ≈ **47 M USD**
(sensitivity 32–66 M USD; NOT an annual flow → not capitalized).

---

## Alto Madre de Dios — validation_madre_de_dios.js (AOI: HydroBASINS hybas_8, Pfafstetter-prefix match)
| Variable | Value | Unit | Scale | Date window | Source |
|---|---|---|---|---|---|
| Basin area | 35,183.22 | km² | — | — | HydroSHEDS hybas_8, PFAF_ID prefix (PREFIX_LEN=7) |
| Hansen forest loss | 57,141 | ha | 30–100 m | 2020-2024 | UMD Hansen GFC v1.12 |
| RADD alerts | 148,930.05 | ha | 100 m | 2020-2024 | WUR RADD (Sentinel-1) |
| NDVI 2020 / 2024 | 0.773 / 0.792 | – | 300 m | Jun-Sep dry season 2020 / 2023 | Sentinel-2 |
| Condition C 2020 / 2024 | 0.904 / 0.926 | 0–1 | 300 m | dry season | Sentinel-2 (ref 0.85) |
| Landsat NDVI 2024 | 0.813 | – | 500 m | dry 2023-24 | LС08 (Δ(S2-Landsat) = -0.021) |
| NPP 2020 / 2023 | 48.8 / 49.6 | tCO₂/ha·yr | 500 m | annual | MODIS MOD17A3HGF |
| Soil-loss proxy | 0.32 | t/ha·yr | 1000 m | 2022-23 | CHIRPS+SRTM+NDVI |
| MODIS burned | 2,757 | ha | 500 m | 2020-2024 | MCD64A1 |
| Mining-like loss (SWIR/NDVI mask) | 1,371 | ha | 100 m | 2020-2024 | Hansen ∩ high-SWIR/low-NDVI |

> **AOI note**: unlike the Sinú (a standalone coastal basin, correctly selected via
> HydroBASINS `MAIN_BAS`), Alto Madre de Dios is an Amazon tributary; `MAIN_BAS`
> pulls in the entire upstream Amazon network (~5.9M km² on the first run). The AOI
> is instead selected by Pfafstetter-code (`PFAF_ID`) string-prefix match on the
> finer `hybas_8` level — see the `FIX` comments in `validation_madre_de_dios.js`
> and `rf_biomass_mdb_to_madrededios.js` for the exact derivation and the
> PREFIX_LEN tuning log (6 → 125,554 km²; 7 → 35,183 km², kept).

> Mining-like loss (1,371 ha) is a small fraction of total Hansen loss (57,141 ha),
> indicating most detected loss in this basin is non-mining logging/land-use
> change rather than direct evidence of gold-mining extent on its own.

## Random Forest — rf_biomass_mdb_to_madrededios.js (label: NASA/ORNL agb, 2010, 300 m)
| Variable | Value | Unit | Notes |
|---|---|---|---|
| Train / test n | 5,225 / 829 | count | 70/30 MDB split + Madre de Dios tropical samples merged into train (ADD_MDD_TRAINING=true) |
| Predictors | 12 | – | B2-B12, NDVI, NDWI, NBR, elev, slope, precip (identical recipe) |
| R² (test, MDB) | 0.77 | – | held-out; unchanged vs the Sinú transfer despite added tropical samples |
| RMSE | 13.3 | tC/ha | ≈ 48.9 tCO₂/ha |
| Madre de Dios 2020 / 2024 | 409.8 / 414.0 | tCO₂/ha | ADD_MDD_TRAINING=true |
| ΔAGB Madre de Dios | +4.3 | tCO₂/ha | basin-wide mean; local minima over the mining corridor |

> Estimated density (409.8–414.0 tCO₂/ha) sits below the Baccini et al. (2012)
> reference for mature Amazon forest (≈165 tC/ha ≈ 605 tCO₂/ha) — consistent with
> the RMSE-driven underestimation already documented for the Sinú transfer, and
> larger here given the wider tropical-to-semiarid biomass gap being bridged.

## Economic interpretation (Madre de Dios) — paper §4.17
Localized carbon-stock loss from deforestation: 57,141 ha × ≈410 tCO₂/ha ≈ 23.4
MtCO₂ → at 25 USD/tCO₂ ≈ **586 M USD** (sensitivity 446–737 M USD across
390–430 tCO₂/ha × 20–30 USD/tCO₂). One order of magnitude above the Sinú figure
(≈47 M USD), driven by ≈3.9× the deforested area and ≈3.2× the carbon density of
primary Amazon forest vs. the already-intervened Sinú agricultural matrix. As with
the Sinú, this is a **one-off** stock loss, not an annual flow → not capitalized.

> NPP ≠ net sequestration. AGB is a relative approximation calibrated to the 2010
> NASA/ORNL baseline, not an absolute annual carbon inventory. All Madre de Dios
> figures above are the values used in the submitted manuscript (§4.17, Tabla
> 15/16), now fully reconciled — no pending rows remain.
