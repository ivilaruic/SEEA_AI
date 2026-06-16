"""Generate ready-to-use NASA GIBS/Worldview snapshot URLs (raw true-colour and
NDVI) for every site/epoch, plus the cloud-free Sentinel-2 route is handled by
run.py --backend stac. Run:  python -m seea_ai.figure_urls  > docs/image_urls.md
"""
SITES = {
    "Murrumbidgee": [144.0, -35.5, 146.5, -34.0],
    "Rio_Sinu": [-76.5, 8.0, -75.0, 9.5],
    "Magdalena_Medio": [-74.8, 6.0, -73.2, 8.0],
    "Myanmar": [95.0, 20.0, 97.0, 22.0],
}
# Dry-season anchor dates (low cloud) per hemisphere/site
DATES = {
    "Murrumbidgee": {2020: "2020-01-15", 2026: "2026-01-15"},  # AU summer
    "Rio_Sinu": {2020: "2020-02-15", 2026: "2026-02-15"},       # CO dry season
    "Magdalena_Medio": {2020: "2020-02-15", 2026: "2026-02-15"},
    "Myanmar": {2020: "2020-02-15", 2026: "2026-02-15"},        # Myanmar dry season
}
BASE = "https://wvs.earthdata.nasa.gov/api/v1/snapshot"
TRUE = "MODIS_Terra_CorrectedReflectance_TrueColor"
NDVI = "MODIS_Terra_NDVI_8Day"   # 8-day L3 NDVI (processed); composite reduces cloud


def url(bbox, date, layer, w=768, h=768):
    s, w_, n, e = bbox[1], bbox[0], bbox[3], bbox[2]
    return (f"{BASE}?REQUEST=GetSnapshot&TIME={date}"
            f"&BBOX={s},{w_},{n},{e}&CRS=EPSG:4326&LAYERS={layer}"
            f"&WRAP=DAY&FORMAT=image/jpeg&WIDTH={w}&HEIGHT={h}&AUTOSCALE=TRUE")


if __name__ == "__main__":
    print("# Direct NASA Worldview/GIBS snapshot URLs (real imagery)\n")
    print("Open each link, save the PNG/JPEG into `data/imagery/`, then run "
          "`python -m seea_ai.run --backend local-imagery`.\n")
    for site, bbox in SITES.items():
        print(f"## {site}  bbox={bbox}")
        for yr in (2020, 2026):
            d = DATES[site][yr]
            print(f"- {yr} RAW (true colour): {url(bbox, d, TRUE)}")
            print(f"- {yr} PROCESSED (NDVI): {url(bbox, d, NDVI)}")
        print()
