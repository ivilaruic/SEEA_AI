"""SEEA-EA accounting layer: extent, condition, physical & monetary flows, assets.

Implements the stock-flow-value chain formalised in the manuscript:
  X (EO inputs) -> theta (biophysical) -> SE_j (physical flows) -> V (monetary)
  K_phys = E * g(C);  K_t = sum_j V_j ;  dK = K_t - K_{t-1}
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
import numpy as np


def pixel_area_ha(bbox, shape):
    """Approx area per pixel (ha) for a lat/lon bbox sampled on `shape` grid."""
    import math
    w, s, e, n = bbox
    lat = math.radians((s + n) / 2)
    deg_km_lat, deg_km_lon = 111.32, 111.32 * math.cos(lat)
    area_km2 = abs(e - w) * deg_km_lon * abs(n - s) * deg_km_lat
    return area_km2 * 100.0 / (shape[0] * shape[1])  # ha/pixel


@dataclass
class SiteAccount:
    site: str
    year_open: int
    year_close: int
    source: str
    extent_ha: float
    cond_open: float
    cond_close: float
    dcond: float
    deforestation_ha: float
    degradation_ha: float
    burned_ha: float
    carbon_stock_open_tco2: float
    carbon_stock_close_tco2: float
    dcarbon_tco2: float
    sediment_flow_open_t: float
    sediment_flow_close_t: float
    carbon_value_loss_usd: float
    sediment_value_loss_usd: float
    flow_value_loss_usd: float
    nca_open_usd: float
    nca_close_usd: float
    dK_usd: float

    def as_dict(self):
        return asdict(self)


def carbon_stock(cond_arr, area_ha, max_tco2_ha=180.0, frac=0.47):
    """Terrestrial carbon stock (tCO2e) ~ condition-scaled biomass carbon."""
    biomass_c = cond_arr * max_tco2_ha            # tCO2e/ha proxy via condition
    return float(np.nansum(biomass_c) * area_ha)


def sediment_retention(cond_arr, area_ha, max_t_ha=12.0):
    """Physical sediment-retention flow (t/yr), increasing with condition."""
    return float(np.nansum(cond_arr * max_t_ha) * area_ha)


def classify_change(c_open, c_close, hi=0.55, lo=0.30, deg_drop=0.12, burn_drop=0.45):
    """Pixel-level change attribution -> deforestation / degradation / fire masks.

    Deforestation: high-condition (forest, C>hi) pixel collapsing below lo.
    Fire: abrupt large drop (> burn_drop) not already deforestation.
    Degradation: moderate sustained decline (deg_drop..) without land-cover change.
    """
    d = c_close - c_open
    defor = (c_open > hi) & (c_close < lo)
    burn = (d < -burn_drop) & ~defor
    degr = (d < -deg_drop) & ~defor & ~burn
    return defor, degr, burn


def build_account(site, bbox, c_open, c_close, year_open, year_close, source, econ):
    area_ha = pixel_area_ha(bbox, c_open.shape)
    extent_ha = area_ha * c_open.size
    defor, degr, burn = classify_change(c_open, c_close)
    cstock_o = carbon_stock(c_open, area_ha)
    cstock_c = carbon_stock(c_close, area_ha)
    dcarbon = cstock_c - cstock_o
    sed_o = sediment_retention(c_open, area_ha)
    sed_c = sediment_retention(c_close, area_ha)
    cp = econ["carbon_price_usd_per_tco2"]
    sp = econ["sediment_unit_value_usd_per_t"]
    carbon_loss = max(0.0, -(dcarbon)) * cp
    sed_loss = max(0.0, (sed_o - sed_c)) * sp
    flow_loss = carbon_loss + sed_loss
    r = econ["discount_rate"]
    # Asset value = present value of annual service flows + carbon stock value
    nca_o = (sed_o * sp) / r + cstock_o * cp
    nca_c = (sed_c * sp) / r + cstock_c * cp
    return SiteAccount(
        site=site, year_open=year_open, year_close=year_close, source=source,
        extent_ha=extent_ha, cond_open=float(np.nanmean(c_open)),
        cond_close=float(np.nanmean(c_close)),
        dcond=float(np.nanmean(c_close) - np.nanmean(c_open)),
        deforestation_ha=float(defor.sum() * area_ha),
        degradation_ha=float(degr.sum() * area_ha),
        burned_ha=float(burn.sum() * area_ha),
        carbon_stock_open_tco2=cstock_o, carbon_stock_close_tco2=cstock_c,
        dcarbon_tco2=dcarbon, sediment_flow_open_t=sed_o, sediment_flow_close_t=sed_c,
        carbon_value_loss_usd=carbon_loss, sediment_value_loss_usd=sed_loss,
        flow_value_loss_usd=flow_loss, nca_open_usd=nca_o, nca_close_usd=nca_c,
        dK_usd=nca_c - nca_o)
