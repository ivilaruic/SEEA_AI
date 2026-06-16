// =====================================================
// SEEA-AI  |  MURRAY-DARLING BASIN  |  Financial year 2018-19
// External validation against Smith et al. (2025), Ecosystem Services 74, 101741.
// PRIMARY: Sentinel-2 SR | VERIFY: Landsat 8 + Hansen + MODIS Burned
// CARBON: NASA/ORNL biomass (stock) + MODIS NPP (sequestration proxy)
// All basin-mean stats use MEAN composites + coarse scale to avoid timeouts.
// =====================================================

// 0) AOI — official MDBA boundary (Water Act 2007) uploaded as an EE asset
var mdb = ee.FeatureCollection('projects/seea-ai/assets/mdb_boundary');
var aoi = mdb.geometry();
print('MDB area km2', aoi.area(1).divide(1e6));        // sanity ~1.06e6
Map.centerObject(mdb, 6);
Map.addLayer(mdb, {color: 'black'}, 'MDB boundary', false);

var SUMMER = ['2018-12-01', '2019-02-28'];             // homogeneous window
var WIN = ['2018-07-01', '2019-06-30'];                // financial year (annual layers)
var REF_HIGH = 0.70, REF_LOW = 0.05;                   // semi-arid condition anchor
var TCO2 = 44 / 12;

// Robust basin-mean / area helpers (coarse scale + high tileScale)
function meanBand(img, band, scale, name) {
  var v = img.reduceRegion({reducer: ee.Reducer.mean(), geometry: aoi, scale: scale,
    maxPixels: 1e13, bestEffort: true, tileScale: 16}).get(band);
  print(name, v); return ee.Number(v);
}
function areaSumHa(img, scale, name) {
  var v = img.selfMask().multiply(ee.Image.pixelArea()).divide(1e4)
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: scale,
      maxPixels: 1e13, bestEffort: true, tileScale: 16}).values().get(0);
  print(name, v); return ee.Number(v);
}

// =====================================================
// 1) SENTINEL-2 SR + Cloud Score+  -> RGB, NDVI, CONDITION (mean composite)
// =====================================================
var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
var CSPLUS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var QA_BAND = 'cs_cdf', CLEAR = 0.60;
var S2_BANDS = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12'];

var s2 = S2.filterBounds(aoi).filterDate(SUMMER[0], SUMMER[1])
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 40))
  .linkCollection(CSPLUS, [QA_BAND])
  .map(function (img) {
    return img.updateMask(img.select(QA_BAND).gte(CLEAR))
      .select(S2_BANDS).divide(10000).copyProperties(img, ['system:time_start']);
  });
print('S2 2018-19 scenes', s2.size());

var comp = s2.median().clip(mdb);                       // for display only
Map.addLayer(comp, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 RGB 2018-19');
var land = comp.normalizedDifference(['B3', 'B11']).gt(0).not();   // water mask

// Basin-mean NDVI & condition via MEAN composite (cheap -> no timeout)
var ndviImg = s2.map(function (i) {
  return i.normalizedDifference(['B8', 'B4']).rename('NDVI');
}).mean().updateMask(land);
Map.addLayer(ndviImg, {min: 0, max: 0.8, palette: ['#a50026', '#ffffbf', '#006837']}, 'S2 NDVI');
var condImg = ndviImg.subtract(REF_LOW).divide(REF_HIGH - REF_LOW).clamp(0, 1).rename('C');
Map.addLayer(condImg, {min: 0, max: 1, palette: ['#a50026', '#ffffbf', '#006837']}, 'Condition C');
var ndviMean = meanBand(ndviImg, 'NDVI', 500, 'S2_NDVI_mean');
var condMean = meanBand(condImg, 'C', 500, 'Condition_mean');

// =====================================================
// 2) VERIFY — LANDSAT 8 (cross-sensor NDVI, mean composite)
// =====================================================
function maskLandsat(img) {
  var qa = img.select('QA_PIXEL');
  var m = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(['SR_B4', 'SR_B5']).multiply(0.0000275).add(-0.2)
    .updateMask(m).copyProperties(img, ['system:time_start']);
}
var lsNdvi = ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
  .filterBounds(aoi).filterDate(SUMMER[0], SUMMER[1]).map(maskLandsat)
  .map(function (i) { return i.normalizedDifference(['SR_B5', 'SR_B4']).rename('NDVI'); })
  .mean().updateMask(land);
var lsMean = meanBand(lsNdvi, 'NDVI', 500, 'Landsat_NDVI_mean');
print('S2_minus_Landsat_NDVI', ndviMean.subtract(lsMean));

// =====================================================
// 3) CARBON STOCK — NASA/ORNL aboveground biomass carbon (tCO2/ha, woody)
// =====================================================
var agbCO2 = ee.ImageCollection('NASA/ORNL/biomass_carbon_density/v1').first()
  .select('agb').multiply(TCO2).clip(mdb).rename('AGB_tCO2_ha');
var agbMean = meanBand(agbCO2, 'AGB_tCO2_ha', 300, 'EO_AGB_carbon_tCO2_ha');

// =====================================================
// 4) SEQUESTRATION — MODIS NPP (MOD17A3HGF) 2018 -> tCO2/ha/yr
// =====================================================
var nppCO2 = ee.ImageCollection('MODIS/061/MOD17A3HGF')
  .filterDate('2018-01-01', '2019-01-01').first()
  .select('Npp').multiply(0.0001).multiply(10).multiply(TCO2).clip(mdb).rename('NPP_tCO2_ha_yr');
var nppMean = meanBand(nppCO2, 'NPP_tCO2_ha_yr', 500, 'EO_NPP_sequestration_tCO2_ha_yr');

// =====================================================
// 5) SEDIMENT — simplified RUSLE soil-loss PROXY (t/ha/yr) [order of magnitude]
// =====================================================
var P = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
  .filterDate(WIN[0], WIN[1]).select('precipitation').sum().clip(mdb);
var R = P.multiply(0.5);
var K = ee.Image(0.03);
var slope = ee.Terrain.slope(ee.Image('USGS/SRTMGL1_003')).multiply(Math.PI / 180);
var LS = slope.sin().multiply(10.8).add(0.03);
var C = ndviImg.expression('exp(-2 * b / (1 - b))', {b: ndviImg}).clamp(0, 1);
var soilLoss = R.multiply(K).multiply(LS).multiply(C).rename('A_t_ha_yr');
var lossMean = meanBand(soilLoss, 'A_t_ha_yr', 300, 'EO_soilloss_proxy_t_ha_yr');

// =====================================================
// 6) DISTURBANCE VERIFIERS (2018-19)
// =====================================================
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var hansen = gfc.select('lossyear').gte(18).and(gfc.select('lossyear').lte(19)).clip(aoi);
Map.addLayer(hansen.selfMask(), {palette: ['red']}, 'Hansen Loss 2018-19');
var burned = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterDate(WIN[0], WIN[1]).select('BurnDate').max().gt(0).clip(aoi);
Map.addLayer(burned.selfMask(), {palette: ['orange']}, 'MODIS Burned 2018-19', false);
areaSumHa(hansen, 300, 'HansenLoss_ha_2018_19');
areaSumHa(burned, 500, 'BurnedArea_ha_2018_19');

// =====================================================
// 7) BENCHMARK — EO (SEEA-AI) vs Smith et al. (2025), per unit
// =====================================================
var smith = ee.Dictionary({
  carbon_storage_tCO2_ha_TOTAL_inclSoil: 346,
  carbon_sequestration_tCO2_ha_yr: 9.9,
  sediment_retention_t_ha_yr: 0.47
});
var eo = ee.Dictionary({
  NDVI_mean: ndviMean, Condition_mean: condMean,
  EO_AGB_carbon_tCO2_ha_biomassOnly: agbMean,
  EO_NPP_sequestration_tCO2_ha_yr: nppMean,
  EO_soilloss_proxy_t_ha_yr: lossMean
});
print('=== SMITH et al. 2025 (per ha) ===', smith);
// async evaluate -> avoids the synchronous print timeout on the bundled dictionary
eo.evaluate(function (o) { print('=== SEEA-AI EO estimates (per ha) ===', o); });
print('NOTE: AGB is biomass-only (Smith storage includes soil); NPP > net sequestration; ' +
      'RUSLE = gross-loss proxy, not Smith retention. Compare orders of magnitude & ratios.');

// =====================================================
// 8) EXPORTS (Drive -> SEEA_AI_VALIDATION)
// =====================================================
function exp(img, name, scale) {
  Export.image.toDrive({image: img, description: name, folder: 'SEEA_AI_VALIDATION',
    region: aoi, scale: scale, maxPixels: 1e13});
}
exp(comp.select(['B4', 'B3', 'B2']), 'MDB_S2_RGB_2018_19', 20);
exp(ndviImg,  'MDB_S2_NDVI_2018_19', 20);
exp(condImg,  'MDB_Condition_2018_19', 20);
exp(agbCO2,   'MDB_AGB_carbon_tCO2ha', 100);
exp(nppCO2,   'MDB_NPP_tCO2ha_yr', 500);
