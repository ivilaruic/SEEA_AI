# SEEA-AI — Reproducible natural-capital accounting from AI + remote sensing

Reference implementation accompanying:

> Vilar Ramirez, I., González, M. F., Bastons Prat, M. (2026). *SEEA-AI: A new
> model for quantifying natural capital and its environmental-economic impact
> using AI and remote sensing.* Submitted to **Ecosystem Services** (Elsevier).

SEEA-AI links Earth observation, a supervised condition model, and the SEEA-EA
accounting structure (extent → condition → physical flows → monetary flows →
assets) into one reproducible stock–flow–value pipeline.

## Validation sites (`config/sites.yaml`)

| Site | Country | Role | bbox `[W,S,E,N]` |
|---|---|---|---|
| Murrumbidgee | Australia | reference (CSIRO MDB) | `144.0, -35.5, 146.5, -34.0` |
| Rio_Sinu | Colombia | primary case | `-76.5, 8.0, -75.0, 9.5` |
| Magdalena_Medio | Colombia | transfer | `-74.8, 6.0, -73.2, 8.0` |
| Myanmar | Myanmar | transfer | `95.0, 20.0, 97.0, 22.0` |

Epochs: **2020 → 2026**.

## Install

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
# Real Sentinel-2 (cloud-free median composite) via public STAC — no account needed
python -m seea_ai.run --backend stac --ai sklearn --out results

# Offline reproducible demonstration (deterministic synthetic EO, no network)
python -m seea_ai.run --backend offline --ai numpy --out results
```

Outputs per site: `results/<site>_account.json`, `results/accounts_summary.csv`,
`results/ai_metrics.csv`, and figures `results/figures/<site>_<year>_raw.png`
(true-colour) and `_processed.png` (condition C).

## Real imagery for the figures

Two routes:

1. **Sentinel-2 (recommended, cloud-free):** `--backend stac` builds a yearly
   median composite per bbox and writes the raw + processed PNGs automatically.
2. **NASA Worldview / GIBS quick-look:** ready-to-open snapshot URLs for all 16
   images (raw true-colour + NDVI, 2020 & 2026, 4 sites) are in
   [`docs/image_urls.md`](docs/image_urls.md). Save them into `data/imagery/`.

## Module map

```
src/seea_ai/
  fetch.py            EO acquisition (STAC / GEE) + deterministic offline sample
  indices.py          NDVI, NDWI, SEEA-EA condition index C∈[0,1]
  condition_model.py  Random Forest (sklearn) + pure-numpy fallback; R²/RMSE
  accounting.py       extent, condition, carbon & sediment flows, valuation, ΔK
  run.py              end-to-end driver + figure export
  figure_urls.py      generates docs/image_urls.md
config/sites.yaml     sites, epochs, economic parameters
notebooks/demo.ipynb  guided walkthrough
data/DATA_DICTIONARY.md
docs/CSIRO_BENCHMARK.md  structural validation against CSIRO MDB accounts
```

## CSIRO benchmark

The Murrumbidgee site is calibrated against the CSIRO *Experimental ecosystem
accounts for the Murray–Darling Basin* (condition index 0–1; extent, condition,
biodiversity, carbon, water/sediment and biomass services). See
[`docs/CSIRO_BENCHMARK.md`](docs/CSIRO_BENCHMARK.md).

## Reproducibility note

Figures/numbers produced with `--backend offline` are **deterministic
demonstration outputs from synthetic inputs**, flagged `source=offline_sample`
in every record. Publication results must be produced with `--backend stac`
(or GEE). The pipeline, parameters and seeds are fixed for full reproducibility.

## License

MIT — see [LICENSE](LICENSE).
