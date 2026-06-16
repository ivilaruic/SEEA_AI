# Murray–Darling Basin perimeter (uploaded to Earth Engine assets)

Official MDBA boundary, "Water Act 2007" (CC-BY 4.0) — the SAME perimeter used by
Smith et al. (2025). This is the AOI the GEE scripts expect.

## Earth Engine asset (already uploaded)
    projects/seea-ai/assets/mdb_boundary

Used in the scripts as:
    var mdb = ee.FeatureCollection('projects/seea-ai/assets/mdb_boundary');

## Source download (to re-upload / reproduce)
Dataset (data.gov.au / MDBA):
https://data.gov.au/data/dataset/murray-darling-basin-boundary

Shapefile (.zip, 189 KB):
https://data.gov.au/data/dataset/4ede9aed-5620-47db-a72b-0b3aa0a3ced0/resource/8a6d889d-723b-492d-8c12-b8b0d1ba4b5a/download/mdb_boundary.zip

GeoJSON (WFS):
https://data.gov.au/geoserver/murray-darling-basin-boundary/wfs?request=GetFeature&typeName=ckan_4ede9aed-5620-47db-a72b-0b3aa0a3ced0&outputFormat=json

To re-upload: GEE → Assets → New → Table upload (Shapefile) → upload the .zip →
name it `mdb_boundary` under your cloud project.

Sanity check after loading: `print('MDB area km2', aoi.area(1).divide(1e6))` ≈ 1.06e6.
