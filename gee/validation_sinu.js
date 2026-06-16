// =====================================================
// SEEA-AI | RÍO SINÚ — full account  |  2020 vs 2024
// Mirror of the Murray-Darling script, re-localised for the TROPICS:
//   - condition reference REF_HIGH = 0.85 (tropical, not 0.70 semi-arid)
//   - RADD/GFW alerts INCLUDED (humid-tropics product, valid here)
// PRIMARY: Sentinel-2 SR | VERIFY: Landsat 8 + Hansen + RADD + MODIS Burned
// Carbon (AGB tCO2/ha): from the RF script (MDB+Sinú): 2020≈132, 2024≈140, Δ≈+8.9
// =====================================================

// 0) AOI — whole Sinú basin (HydroBASINS MAIN_BAS)
var hb = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_7');
var seed = ee.Feature(hb.filterBounds(ee.Geometry.Point([-75.88, 8.75])).first());
var sinu = hb.filter(ee.Filter.eq('MAIN_BAS', seed.get('MAIN_BAS')));
var aoi = sinu.geometry();
print('Sinu basin area km2', aoi.area(1).divide(1e6));   // ~14.000
Map.centerObject(sinu, 8);
Map.addLayer(sinu, {color: 'blue'}, 'Sinu boundary', false);

var W20 = ['2019-12-01', '2020-03-31'];                  // dry-season windows
var W24 = ['2023-12-01', '2024-03-31'];
var REF_HIGH = 0.85, REF_LOW = 0.05;                     // TROPICAL condition anchor
var TCO2 = 44 / 12;

// ----- helpers -----
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

// 1) SENTINEL-2 — RGB, NDVI, CONDITION (tropical), change
var c20 = s2(W20).median().clip(sinu);
var c24 = s2(W24).median().clip(sinu);
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

// 3) SEQUESTRATION — MODIS NPP (tCO2/ha/yr), 2020 & 2024
function npp(yr) {
  return ee.ImageCollection('MODIS/061/MOD17A3HGF')
    .filterDate(yr + '-01-01', (yr + 1) + '-01-01').first()
    .select('Npp').multiply(0.0001).multiply(10).multiply(TCO2).clip(sinu).rename('NPP');
}
meanBand(npp(2020), 'NPP', 500, 'NPP_2020_tCO2_ha_yr');
meanBand(npp(2023), 'NPP', 500, 'NPP_2023_tCO2_ha_yr');   // latest full MODIS year

// 4) SEDIMENT — simplified RUSLE proxy (t/ha/yr)
var DEM = ee.Image('USGS/SRTMGL1_003');
var R = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY').filterDate('2023-07-01', '2024-06-30')
  .select('precipitation').sum().multiply(0.5).clip(sinu);
var LS = ee.Terrain.slope(DEM).multiply(Math.PI / 180).sin().multiply(10.8).add(0.03);
var Cf = nd24.expression('exp(-2 * b / (1 - b))', {b: nd24}).clamp(0, 1);
meanBand(R.multiply(0.03).multiply(LS).multiply(Cf).rename('A'), 'A', 1000,
  'soilloss_proxy_t_ha_yr');

// 5) DISTURBANCE — Hansen + RADD + MODIS Burned (2020-2024)
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var hansen = gfc.select('lossyear').gte(20).and(gfc.select('lossyear').lte(24)).clip(aoi);
Map.addLayer(hansen.selfMask(), {palette: ['red']}, 'Hansen Loss 2020-2024');
areaHa(hansen, 30, 'HansenLoss_ha_2020_2024');

var radd = ee.ImageCollection('projects/radar-wur/raddalert/v1')
  .filterMetadata('layer', 'contains', 'alert').filterMetadata('geography', 'equals', 'sa')
  .sort('system:time_end', false).mosaic();
var raddY = radd.select('Date').divide(1000).floor();
var raddC = radd.select('Alert').eq(3).and(raddY.gte(20)).and(raddY.lte(24)).clip(aoi);
Map.addLayer(raddC.selfMask(), {palette: ['magenta']}, 'GFW/RADD alerts 2020-2024');
areaHa(raddC, 30, 'RADD_alert_ha_2020_2024');

var burned = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterDate('2020-01-01', '2024-12-31').select('BurnDate').max().gt(0).clip(aoi);
Map.addLayer(burned.selfMask(), {palette: ['orange']}, 'MODIS Burned 2020-2024', false);
areaHa(burned, 500, 'BurnedArea_ha_2020_2024');

print('NOTE — carbon stock (AGB) for this basin comes from the RF script ' +
      '(trained MDB+Sinú): 2020 ≈ 132, 2024 ≈ 140, ΔAGB ≈ +8,9 tCO2/ha.');

// 6) EXPORTS
function exp(img, name, scale) {
  Export.image.toDrive({image: img, description: name, folder: 'SEEA_AI_VALIDATION',
    region: aoi, scale: scale, maxPixels: 1e13});
}
exp(c20.select(['B4', 'B3', 'B2']), 'Sinu_S2_RGB_2020', 10);
exp(c24.select(['B4', 'B3', 'B2']), 'Sinu_S2_RGB_2024', 10);
exp(cond24, 'Sinu_Condition_2024', 10);
exp(dNDVI, 'Sinu_dNDVI_2020_2024', 10);
exp(hansen, 'Sinu_HansenLoss_2020_2024', 30);
