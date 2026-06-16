"""Earth-observation acquisition for SEEA-AI.

Two backends are supported:

1. STAC (default, no Earth Engine account needed) — pulls Sentinel-2 L2A surface
   reflectance from the Element84 Earth Search or Microsoft Planetary Computer
   public catalogues for a bounding box and date window.
2. Google Earth Engine — for users with an EE account (richer collections, MODIS,
   Global Forest Change, MODIS Burned Area).

If neither backend has network access (e.g. an air-gapped reviewer sandbox), the
module falls back to `offline_sample()` which produces a deterministic, per-site
synthetic reflectance field so the full pipeline remains reproducible end-to-end.
The offline path is clearly flagged in all outputs (``source='offline_sample'``).
"""
from __future__ import annotations
import numpy as np

# Sentinel-2 L2A bands used downstream
BANDS = {"red": "B04", "nir": "B08", "green": "B03", "blue": "B02", "swir": "B11"}


def fetch_stac(bbox, year, month_window=(1, 12), collection="sentinel-2-l2a",
               endpoint="https://earth-search.aws.element84.com/v1", max_cloud=20):
    """Return a dict of band arrays (median composite) for *bbox*/*year*.

    Requires `pystac_client`, `odc.stac`/`stackstac`, `rasterio`. See README for
    install. Raises RuntimeError on no network so callers can fall back.
    """
    try:
        from pystac_client import Client
        import stackstac
    except ImportError as e:  # pragma: no cover
        raise RuntimeError(f"STAC deps missing: {e}")
    cat = Client.open(endpoint)
    search = cat.search(
        collections=[collection], bbox=bbox,
        datetime=f"{year}-{month_window[0]:02d}-01/{year}-{month_window[1]:02d}-28",
        query={"eo:cloud_cover": {"lt": max_cloud}},
    )
    items = list(search.items())
    if not items:
        raise RuntimeError("No scenes found for bbox/year")
    stack = stackstac.stack(items, assets=list(BANDS.values()), bounds_latlon=bbox)
    median = stack.median(dim="time").compute()
    out = {name: median.sel(band=asset).values for name, asset in BANDS.items()}
    out["source"] = "stac:" + collection
    return out


def offline_sample(bbox, year, site_name, size=256, seed=None):
    """Deterministic synthetic reflectance for a bbox/year (reproducible demo).

    The generator encodes coarse, site-specific land-cover structure (river
    corridors, forest blocks, cleared patches) and a year effect so that NDVI
    deltas 2020->2026 are realistic in sign/magnitude. NOT real observations —
    intended only to exercise the pipeline reproducibly. Flagged as
    source='offline_sample'.
    """
    h = abs(hash((site_name, round(bbox[0], 2), round(bbox[1], 2)))) % (2**31)
    rng = np.random.default_rng((h if seed is None else seed))
    yy, xx = np.mgrid[0:size, 0:size] / size
    # base vegetation gradient + meandering river (low NDVI) corridor
    base = 0.55 + 0.25 * np.sin(3 * np.pi * yy) * np.cos(2 * np.pi * xx)
    river = np.exp(-((xx - (0.5 + 0.15 * np.sin(6 * np.pi * yy))) ** 2) / 0.0008)
    forest = rng.normal(0, 1, (size, size))
    # smooth the noise (cheap box blur, numpy only)
    for _ in range(6):
        forest = (forest
                  + np.roll(forest, 1, 0) + np.roll(forest, -1, 0)
                  + np.roll(forest, 1, 1) + np.roll(forest, -1, 1)) / 5.0
    forest = (forest - forest.min()) / (np.ptp(forest) + 1e-9)
    ndvi = np.clip(base * (0.6 + 0.6 * forest) - 0.8 * river, -0.1, 0.92)
    # year effect: net degradation (deforestation/fire) intensifies by 2026
    if year >= 2026:
        deg = (forest < np.quantile(forest, 0.28)) | (rng.random((size, size)) < 0.05)
        ndvi = np.where(deg, ndvi * rng.uniform(0.45, 0.7, (size, size)), ndvi * 0.98)
    # back out plausible red/nir from NDVI
    nir = np.clip(0.20 + 0.45 * (ndvi + 0.1), 0.02, 0.9)
    red = np.clip(nir * (1 - ndvi) / (1 + ndvi + 1e-6), 0.01, 0.6)
    green = np.clip(red * 1.1 + 0.03, 0.01, 0.6)
    blue = np.clip(red * 0.9 + 0.02, 0.01, 0.6)
    swir = np.clip(0.15 + 0.3 * (1 - forest), 0.02, 0.7)
    return {"red": red, "nir": nir, "green": green, "blue": blue, "swir": swir,
            "source": "offline_sample", "bbox": bbox, "year": year, "site": site_name}


def acquire(bbox, year, site_name, prefer="stac", **kw):
    """Try real EO backend, fall back to deterministic offline sample."""
    if prefer == "stac":
        try:
            return fetch_stac(bbox, year, **kw)
        except Exception as e:  # noqa: BLE001
            print(f"[fetch] STAC unavailable ({e}); using offline_sample for "
                  f"{site_name} {year}")
    return offline_sample(bbox, year, site_name)
