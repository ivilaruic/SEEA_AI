# Benchmark — CSIRO Murray–Darling Basin (Smith et al., 2025)

The SEEA-AI method is validated against the peer-reviewed SEEA-EA accounts of the
Murray–Darling Basin (MDB), published in the same journal:

> Smith, G.S., Stewart, S.B., Scheufele, G., Evans, D., Liu, N., Pascoe, S.,
> Roxburgh, S.H., Schmidt, R.K., Vardon, M. (2025). *Accounting for ecosystem
> services using extended supply and use tables: A case study of the
> Murray-Darling Basin, Australia.* **Ecosystem Services 74, 101741.**
> https://doi.org/10.1016/j.ecoser.2025.101741  (open access, CC BY)

MDB accounting year **2018–19**; basin area ≈ **1.06 M km²** (official MDBA
boundary, Water Act 2007).

## Published reference values (Smith et al., 2025)

| Service (MDB, 2018-19) | Physical | Monetary |
|---|---|---|
| Crops | 12,537,745 t | — |
| Grazed biomass | 3,320,371 t | **$907 M** |
| Water supply (agric.) | 8,894,954 ML | — |
| Sediment retention | **49,725 kt/yr** | — |
| Carbon — sequestration | **1,054 Mt CO₂e/yr** | — |
| Carbon — storage (incl. soil) | **36,708 Mt CO₂e** (30 Jun 2019) | — |

Per-hectare (÷ ~1.06e8 ha): sequestration **9.9 tCO₂/ha·yr**, storage
**346 tCO₂/ha** (soil-dominated), sediment retention **0.47 t/ha·yr**.

## SEEA-AI validation (this work) vs benchmark

| Variable (per ha) | SEEA-AI (EO) | Smith 2025 | Agreement |
|---|---|---|---|
| Area | 1,059,394 km² | ~1.06 M km² | ✓ official boundary |
| Carbon sequestration | 12.6 tCO₂/ha·yr (MODIS NPP) | 9.9 | same order, +27% (NPP > NECB) |
| Carbon stock (AGB) | 48.0 tCO₂/ha (biomass) | 346 (incl. soil) | component-matched (soil excluded) |
| Sediment (RUSLE proxy) | 0.63 t/ha·yr | 0.47 | same order (gross loss ≠ retention) |
| Random-Forest biomass | **R²=0.77, RMSE=13.2 tC/ha** | NASA/ORNL labels | validated on held-out test |
| Cross-sensor S2↔Landsat | Δ = −0.048 | — | within known offset |
| Hansen forest loss 2018-19 | 524,266 ha | — | independent verification |
| MODIS burned 2018-19 | 193,105 ha | — | independent verification |

> Soil carbon (most of Smith's 346 tCO₂/ha) is **not** retrievable from Sentinel;
> use a soil product (SoilGrids/ISRIC or SLGA-TERN) — see references in the paper.

## Labels & temporal caveat (Random Forest)
The RF biomass labels come from **NASA/ORNL Harmonized biomass carbon density**
(Spawn et al., 2020), a **2010 global baseline at ~300 m**. Predictors are
Sentinel-2 (2018–2024). The RF therefore learns a *spatial* biomass–reflectance
relationship anchored to 2010 and applies it to later predictors: outputs are a
**relative approximation / spatial contrast**, not an absolute annual inventory.
For an annual time series consider **ESA CCI Biomass** (2007, 2010, 2015–2022).
