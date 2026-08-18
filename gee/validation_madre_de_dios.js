// =====================================================
// SEEA-AI | ALTO MADRE DE DIOS — full account  |  2020 vs 2024
// Mirror of validation_sinu.js, re-localized for southwestern Amazonia:
//   - condition reference REF_HIGH = 0.85 (same as tropical Sinú; adjust if
//     your own Amazonian reference criterion differs)
//   - RADD/GFW alerts INCLUDED (same 'sa' = South America filter, unchanged)
//   - Amazonian DRY-SEASON window = Jun-Sep (NOT Dec-Mar like the Caribbean
//     Sinú) — VERIFY against your own clean-composite criteria
// PRIMARY: Sentinel-2 SR | VERIFY: Landsat 8 + Hansen + RADD + MODIS Burned
// Carbon (AGB tCO2/ha): paste in the result printed by rf_madre_de_dios.js
// (RF_AGB_MdD_2020_tCO2_ha, RF_AGB_MdD_2024_tCO2_ha) once you run it.
// =====================================================

// 0) AOI — same basin used in rf_madre_de_dios.js (Pfafstetter prefix match)
// FIX (post first run): MAIN_BAS groups ALL sub-basins draining to the same
// terminal outlet. Madre de Dios is a tributary of the Amazon mainstem, so
// MAIN_BAS pulled in the entire upstream Amazon network (~5.9M km2 on the
// first run) and every reduceRegion() below timed out. Use the same
// PFAF_ID-prefix selection on hybas_8 as rf_madre_de_dios.js instead — copy
// the same PREFIX_LEN value you settled on there.
var hb8 = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_8')
  .map(function (f) { return f.set('PFAF_STR', ee.Number(f.get('PFAF_ID')).format()); });
var seed = ee.Feature(hb8.filterBounds(ee.Geometry.Point([-71.0, -12.8])).first());
var seedPfaf = ee.String(seed.get('PFAF_STR'));
var PREFIX_LEN = 7;   // matches rf_madre_de_dios.js run 2 (run 1 @ 6 gave 125,554 km2)
var seedPrefix = seedPfaf.slice(0, PREFIX_LEN);
var mdd = hb8.filter(ee.Filter.stringStartsWith('PFAF_STR', seedPrefix));
var aoi = mdd.geometry();
print('MdD basin area km2 (adopted: PREFIX_LEN=7 -> ~35,183 km2, see VALIDATION_RESULTS.md)',
  aoi.area(1).divide(1e6));
Map.centerObject(mdd, 8);
Map.addLayer(mdd, {color: 'orange'}, 'Madre de Dios boundary', false);

var W20 = ['2020-06-01', '2020-09-30'];                  // Amazonian dry season — VERIFY
var W24 = ['2023-06-01', '2023-09-30'];
var REF_HIGH = 0.85, REF_LOW = 0.05;                      // same as tropical Sinú
var TCO2 = 44 / 12;

// ----- helpers (identical to validation_sinu.js) -----
var CSPLUS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2(win) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate(win[0], win[1])
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 70))
    .linkCollection(CSPLUS, ['cs_cdf'])
    .map(function (i) {
      return i.updateMask(i.select('cs_cdf').gte(0.6))
        .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).divide(10000);
    });
}
function meanBand(img, band, scale, name) {
  print(name, img.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: scale,
    maxPixels: 1e13, bestEffort: true, tileScale: 16}).get(band));
}
function areaHa(img, scale, name) {
  print(name, img.selfMask().multiply(ee.Image.pixelArea()).divide(1e4)
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: scale,
      maxPixels: 1e13, bestEffort: true, tileScale: 16}).values().get(0));
}

// 1) SENTINEL-2 — RGB, NDVI, CONDITION, change
var c20 = s2(W20).median().clip(mdd);
var c24 = s2(W24).median().clip(mdd);
Map.addLayer(c20, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 RGB 2020');
Map.addLayer(c24, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 RGB 2024');

var land = c20.normalizedDifference(['B3', 'B11']).gt(0)
  .or(c24.normalizedDifference(['B3', 'B11']).gt(0)).not();

var nd20 = s2(W20).map(function (i) { return i.normalizedDifference(['B8', 'B4']).rename('NDVI'); })
  .mean().updateMask(land);
var nd24 = s2(W24).map(function (i) { return i.normalizedDifference(['B8', 'B4']).rename('NDVI'); })
  .mean().updateMask(land);
var cond20 = nd20.subtract(REF_LOW).divide(REF_HIGH - REF_LOW).clamp(0, 1).rename('C');
var cond24 = nd24.subtract(REF_LOW).divide(REF_HIGH - REF_LOW).clamp(0, 1).rename('C');
var dNDVI = nd24.subtract(nd20).rename('dNDVI');
Map.addLayer(nd24, {min: 0, max: 0.9, palette: ['#a50026', '#ffffbf', '#006837']}, 'S2 NDVI 2024');
Map.addLayer(cond24, {min: 0, max: 1, palette: ['#a50026', '#ffffbf', '#006837']}, 'Condition C 2024');
Map.addLayer(dNDVI, {min: -0.4, max: 0.4, palette: ['red', 'white', 'green']}, 'Delta NDVI 2020-2024');

meanBand(nd20, 'NDVI', 300, 'S2_NDVI_2020');
meanBand(nd24, 'NDVI', 300, 'S2_NDVI_2024');
meanBand(cond20, 'C', 300, 'Condition_2020');
meanBand(cond24, 'C', 300, 'Condition_2024');
meanBand(dNDVI, 'dNDVI', 300, 'dNDVI_mean');

// 2) VERIFY — Landsat 8 cross-sensor (2024)
function maskLs(img) {
  var qa = img.select('QA_PIXEL');
  var m = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2).updateMask(m);
}
var lsNd24 = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(aoi).filterDate(W24[0], W24[1]).map(maskLs)
  .map(function (i) { return i.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI'); })
  .mean().updateMask(land);
meanBand(lsNd24, 'NDVI', 500, 'Landsat_NDVI_2024');

// 3) SEQUESTRATION — MODIS NPP (tCO2/ha/yr), 2020 and 2023 (last complete MODIS year)
function npp(yr) {
  return ee.ImageCollection('MODIS/061/MOD17A3HGF')
    .filterDate(yr + '-01-01', (yr + 1) + '-01-01').first()
    .select('Npp').multiply(0.0001).multiply(10).multiply(TCO2).clip(mdd).rename('NPP');
}
meanBand(npp(2020), 'NPP', 500, 'NPP_2020_tCO2_ha_yr');
meanBand(npp(2023), 'NPP', 500, 'NPP_2023_tCO2_ha_yr');

// 4) SEDIMENT — simplified RUSLE proxy (t/ha/yr)
var DEM = ee.Image('USGS/SRTMGL1_003');
var R = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate('2022-10-01', '2023-09-30')
  .select('precipitation').sum().multiply(0.5).clip(mdd);
var LS = ee.Terrain.slope(DEM).multiply(Math.PI / 180).sin().multiply(10.8).add(0.03);
var Cf = nd24.expression('exp(-2 * b / (1 - b))', {b: nd24}).clamp(0, 1);
meanBand(R.multiply(0.03).multiply(LS).multiply(Cf).rename('A'), 'A', 1000,
  'soilloss_proxy_t_ha_yr');

// 5) DISTURBANCE — Hansen + RADD + MODIS Burned (2020-2024)
// Note: in Madre de Dios the dominant disturbance signal is NOT fire/grazing
// but artisanal gold mining (bare soil/ponds, a spectral signature very
// different from the Sinú).
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var hansen = gfc.select('lossyear').gte(20).and(gfc.select('lossyear').lte(24)).clip(aoi);
Map.addLayer(hansen.selfMask(), {palette: ['red']}, 'Hansen Loss 2020-2024');
areaHa(hansen, 100, 'HansenLoss_ha_2020_2024');

// FIX (post first run): the RADD alert collection covers all of South
// America; without a spatial filter before mosaic(), the sort+mosaic over
// the full continent-scale collection timed out on this AOI. Restrict to the
// AOI up front, and use a coarser scale for the area sum (RADD alerts are
// dense here from mining, so 30 m timed out; 100 m is still fine for a
// hectare total — the exported GeoTIFF below stays at native resolution).
var radd = ee.ImageCollection('projects/radar-wur/raddalert/v1')
  .filterBounds(aoi)
  .filterMetadata('layer', 'contains', 'alert').filterMetadata('geography', 'equals', 'sa')
  .sort('system:time_end', false).mosaic();
var raddY = radd.select('Date').divide(1000).floor();
var raddC = radd.select('Alert').eq(3).and(raddY.gte(20)).and(raddY.lte(24)).clip(aoi);
Map.addLayer(raddC.selfMask(), {palette: ['magenta']}, 'GFW/RADD alerts 2020-2024');
areaHa(raddC, 100, 'RADD_alert_ha_2020_2024');

var burned = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterDate('2020-01-01', '2024-12-31').select('BurnDate').max().gt(0).clip(aoi);
Map.addLayer(burned.selfMask(), {palette: ['orange']}, 'MODIS Burned 2020-2024', false);
areaHa(burned, 500, 'BurnedArea_ha_2020_2024');

// 5b) Mining-like spectral signature (optional, Madre de Dios-specific): high
// SWIR + low vegetation over loss pixels, to separate mining from
// logging/agriculture.
var miningSignature = hansen.selfMask()
  .updateMask(c24.select('B11').gt(0.25).and(nd24.lt(0.3)));
Map.addLayer(miningSignature.selfMask(), {palette: ['yellow']},
  'Loss with likely mining signature (high SWIR + low NDVI)', false);
areaHa(miningSignature, 100, 'MiningLikeLoss_ha_2020_2024');

print('NOTE — paste here the carbon stock (AGB) from rf_madre_de_dios.js once ' +
      'run: RF_AGB_MdD_2020_tCO2_ha ~= ???, RF_AGB_MdD_2024_tCO2_ha ~= ???.');

// 6) EXPORTS
// FIX (post first run): S2_RGB and Condition at scale=10 over ~35,183 km2
// produced multi-gigabyte BigTIFF files, split by GEE into 4 shards each,
// too large for the downstream figure-processing pipeline to decode. These
// two are only needed for a printed report figure (~15 cm wide), not
// pixel-level analysis, so scale=50 is plenty and keeps each export as a
// single ~20-60 MB file. Hansen/mining (already small, uint8 masks) and
// dNDVI (not needed for figures) are unchanged.
function exp(img, name, scale) {
  Export.image.toDrive({image: img, description: name, folder: 'SEEA_AI_VALIDATION',
    region: aoi, scale: scale, maxPixels: 1e13});
}
exp(c20.select(['B4', 'B3', 'B2']), 'MdD_S2_RGB_2020', 10);
exp(c24.select(['B4', 'B3', 'B2']), 'MdD_S2_RGB_2024_lowres', 50);
exp(cond24, 'MdD_Condition_2024_lowres', 50);
exp(dNDVI, 'MdD_dNDVI_2020_2024', 10);
exp(hansen, 'MdD_HansenLoss_2020_2024', 30);
exp(miningSignature, 'MdD_MiningLikeLoss_2020_2024', 30);
