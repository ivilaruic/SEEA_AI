# Data dictionary — SEEA-AI accounts

Each `*_account.json` / row of `accounts_summary.csv` contains:

| Field | Unit | SEEA-EA account | Description |
|---|---|---|---|
| site | – | – | Site name |
| year_open / year_close | year | – | Accounting period bounds (2020 → 2026) |
| source | – | – | EO source: `stac:sentinel-2-l2a`, `gee`, or `offline_sample` |
| extent_ha | ha | Extent | Total analysed area |
| cond_open / cond_close | index 0–1 | Condition | Territorial mean ecosystem condition C̄ |
| dcond | index | Condition | Δ condition over the period |
| deforestation_ha / degradation_ha / burned_ha | ha | Condition (change attribution) | Hectares by disturbance class |
| carbon_stock_open/close_tco2 | tCO₂e | Asset (carbon) | Condition-scaled biomass carbon stock |
| dcarbon_tco2 | tCO₂e | Physical flow | Net carbon stock change |
| sediment_flow_open/close_t | t/yr | Physical flow | Sediment-retention service flow |
| carbon_value_loss_usd | USD | Monetary flow | Value of carbon stock lost |
| sediment_value_loss_usd | USD | Monetary flow | Value of sediment-retention lost |
| flow_value_loss_usd | USD | Monetary flow | Total annual service-value loss |
| nca_open/close_usd | USD | Asset | Natural-capital asset value (NPV of flows + carbon stock) |
| dK_usd | USD | Asset | Change in natural-capital asset value (wealth) |

`ai_metrics.csv`: per-site R² and RMSE of the Random-Forest condition model
against reference (field-style) condition labels.

> ⚠️ When `source = offline_sample`, all figures are **reproducible demonstration
> outputs from deterministic synthetic inputs**, not measured observations. Run
> with `--backend stac` (Sentinel-2) or the GEE backend for real values.
