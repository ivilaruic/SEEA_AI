"""Spectral indices and ecosystem-condition aggregation (SEEA-EA condition account)."""
from __future__ import annotations
import numpy as np


def ndvi(bands):
    r, n = bands["red"], bands["nir"]
    return (n - r) / (n + r + 1e-9)


def ndwi(bands):
    g, n = bands["green"], bands["nir"]
    return (g - n) / (g + n + 1e-9)


def condition_index(ndvi_arr, ref_high=0.85, ref_low=0.05):
    """Normalise NDVI to a SEEA-EA condition index C in [0,1].

    C=1 corresponds to reference high-integrity vegetation (ref_high), C=0 to bare
    ground/water (ref_low), matching the 0-1 condition convention used by CSIRO.
    """
    c = (ndvi_arr - ref_low) / (ref_high - ref_low)
    return np.clip(c, 0.0, 1.0)


def aggregate_condition(c_arr):
    """Territorial mean condition C-bar (extent-weighted, equal-area pixels)."""
    return float(np.nanmean(c_arr))
