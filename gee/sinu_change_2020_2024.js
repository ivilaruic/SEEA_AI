// =====================================================
// SEEA-AI  |  RÍO SINÚ (whole basin)  |  2020 vs 2024
// PRIMARY  : Sentinel-2 SR (L2A)
// VERIFY   : Landsat 8/9 + Hansen Forest Loss + GFW/RADD alerts + MODIS Burned
// =====================================================
// Period 2020–2024 chosen so Hansen GFC (loss through 2024) covers the FULL
// comparison window. Dry-season windows (Dec–Mar) identical in both epochs.
// =====================================================

// -----------------------------------------------------
// 0) AOI — WHOLE Sinú basin (all hybas_7 sub-basins sharing MAIN_BAS)
// -----------------------------------------------------
var hydro = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_7');
var point = ee.Geometry.Point([-75.88, 8.75]);           // on the Sinú (Montería)
var seed = ee.Feature(hydro.filterBounds(point).first());
var mainBas = seed.get('MAIN_BAS');
var sinu = hydro.filter(ee.Filter.eq('MAIN_BAS', mainBas));  // full drainage system
var aoi = sinu.geometry();
print('Sinu FULL basin area km2', sinu.aggregate_sum('SUB_AREA'));  // expect ~1.3e4
Map.centerObject(sinu, 8);
Map.addLayer(sinu, {color: 'blue'}, 'Sinu Basin (full)', false);

// Identical dry-season windows
var WIN_2020 = ['2019-12-01', '2020-03-31'];
var WIN_2024 = ['2023-12-01', '2024-03-31'];

// =====================================================
// 1) PRIMARY — SENTINEL-2 SR (L2A) + Cloud Score+
// =====================================================
var S2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');
var CSPLUS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var QA_BAND = 'cs_cdf';
var CLEAR = 0.60;
var S2_BANDS = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12'];

function getS2(win) {
  return S2.filterBounds(aoi).filterDate(win[0], win[1])
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 80))
    .linkCollection(CSPLUS, [QA_BAND])
    .map(function (img) {
      return img.updateMask(img.select(QA_BAND).gte(CLEAR))
        .select(S2_BANDS).divide(10000)
        .copyProperties(img, ['system:time_start', 'MGRS_TILE']);
    });
}
var s2_2020 = getS2(WIN_2020);
var s2_2024 = getS2(WIN_2024);
print('S2 2020 scenes', s2_2020.size());
print('S2 2024 scenes', s2_2024.size());

// Valid-observation count (where the comparison is reliable)
Map.addLayer(s2_2020.select('B8').count().clip(sinu),
  {min: 0, max: 40, palette: ['white', 'green']}, 'S2 valid obs 2020', false);
Map.addLayer(s2_2024.select('B8').count().clip(sinu),
  {min: 0, max: 40, palette: ['white', 'green']}, 'S2 valid obs 2024', false);

var m2020 = s2_2020.median().clip(sinu);
var m2024 = s2_2024.median().clip(sinu);
Map.addLayer(m2020, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 RGB 2020');
Map.addLayer(m2024, {bands: ['B4', 'B3', 'B2'], min: 0, max: 0.25}, 'S2 RGB 2024');

function ndvi(img) { return img.normalizedDifference(['B8', 'B4']).rename('NDVI'); }
function nbr(img)  { return img.normalizedDifference(['B8', 'B12']).rename('NBR'); }
function water(img){ return img.normalizedDifference(['B3', 'B11']).gt(0); }  // MNDWI>0

var landMask = water(m2020).or(water(m2024)).not();
var ndvi2020 = ndvi(m2020).updateMask(landMask);
var ndvi2024 = ndvi(m2024).updateMask(landMask);
var nbr2020  = nbr(m2020).updateMask(landMask);
var nbr2024  = nbr(m2024).updateMask(landMask);
var dNDVI = ndvi2024.subtract(ndvi2020).rename('dNDVI');
var dNBR  = nbr2024.subtract(nbr2020).rename('dNBR');
Map.addLayer(dNDVI, {min: -0.4, max: 0.4, palette: ['red', 'white', 'green']}, 'S2 Delta NDVI');
Map.addLayer(dNBR,  {min: -0.4, max: 0.4, palette: ['red', 'white', 'green']}, 'S2 Delta NBR', false);

function meanValue(img, name) {
  print(name, img.reduceRegion({
    reducer: ee.Reducer.mean(), geometry: aoi, scale: 20,
    maxPixels: 1e13, bestEffort: true, tileScale: 4}));
}
meanValue(ndvi2020, 'S2_NDVI_2020');
meanValue(ndvi2024, 'S2_NDVI_2024');
meanValue(dNDVI,    'S2_dNDVI_mean');

// =====================================================
// 2) VERIFY A — LANDSAT 8/9 (cross-sensor)
// =====================================================
function maskLandsat(img) {
  var qa = img.select('QA_PIXEL');
  var mask = qa.bitwiseAnd(1 << 1).eq(0).and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0)).and(qa.bitwiseAnd(1 << 4).eq(0));
  var opt = img.select(['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
    .multiply(0.0000275).add(-0.2);
  return opt.updateMask(mask).copyProperties(img, ['system:time_start']);
}
function getLandsat(win) {
  return ee.ImageCollection('LANDSAT/LC08/C02/T1_L2')
    .merge(ee.ImageCollection('LANDSAT/LC09/C02/T1_L2'))
    .filterBounds(aoi).filterDate(win[0], win[1]).map(maskLandsat);
}
var ls2020 = getLandsat(WIN_2020).median().clip(sinu);
var ls2024 = getLandsat(WIN_2024).median().clip(sinu);
var lsNdvi2020 = ls2020.normalizedDifference(['SR_B5', 'SR_B4']).updateMask(landMask);
var lsNdvi2024 = ls2024.normalizedDifference(['SR_B5', 'SR_B4']).updateMask(landMask);
var lsDNDVI = lsNdvi2024.subtract(lsNdvi2020).rename('dNDVI');
Map.addLayer(lsDNDVI, {min: -0.4, max: 0.4, palette: ['red', 'white', 'green']}, 'Landsat Delta NDVI', false);
meanValue(lsNdvi2020, 'Landsat_NDVI_2020');
meanValue(lsNdvi2024, 'Landsat_NDVI_2024');
meanValue(lsDNDVI,    'Landsat_dNDVI_mean');
meanValue(dNDVI.subtract(lsDNDVI), 'S2_minus_Landsat_dNDVI');  // agreement ~0

// =====================================================
// 3) VERIFY B — HANSEN GLOBAL FOREST CHANGE (loss 2020–2024)  [GFW annual]
// =====================================================
var gfc = ee.Image('UMD/hansen/global_forest_change_2024_v1_12');
var ly = gfc.select('lossyear');
var hansenLoss = ly.gte(20).and(ly.lte(24)).clip(aoi);
Map.addLayer(hansenLoss.selfMask(), {palette: ['red']}, 'Hansen Loss 2020-2024');

function areaHa(img, label, scale) {
  print(label, img.selfMask().multiply(ee.Image.pixelArea()).divide(10000)
    .reduceRegion({reducer: ee.Reducer.sum(), geometry: aoi, scale: scale,
                   maxPixels: 1e13, bestEffort: true, tileScale: 4}));
}
areaHa(hansenLoss, 'HansenLoss_ha_2020_2024', 30);
meanValue(dNDVI.updateMask(hansenLoss), 'S2_dNDVI_over_HansenLoss');  // expect strongly negative

// =====================================================
// 4) VERIFY C — GFW / RADD DEFORESTATION ALERTS (Sentinel-1 radar)
// =====================================================
// RADD (Wageningen, surfaced on Global Forest Watch). 'Date' band = yyDOY;
// 'Alert' = 2 (unconfirmed) / 3 (confirmed). South America coverage from ~2020.
var radd = ee.ImageCollection('projects/radar-wur/raddalert/v1')
  .filterMetadata('layer', 'contains', 'alert')
  .filterMetadata('geography', 'equals', 'sa');     // South America
var raddImg = radd.sort('system:time_end', false).mosaic();
var raddYear = raddImg.select('Date').divide(1000).floor();      // years since 2000
var raddConfirmed = raddImg.select('Alert').eq(3)
  .and(raddYear.gte(20)).and(raddYear.lte(24)).clip(aoi);
Map.addLayer(raddConfirmed.selfMask(), {palette: ['magenta']}, 'GFW/RADD alerts 2020-2024');
areaHa(raddConfirmed, 'RADD_alert_ha_2020_2024', 30);
meanValue(dNDVI.updateMask(raddConfirmed), 'S2_dNDVI_over_RADD');   // expect strongly negative
// (Alternative GFW alert source: GLAD-L, 'projects/glad/alert/...'.)

// =====================================================
// 5) VERIFY D — MODIS BURNED AREA (2020–2024)
// =====================================================
var burned = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterDate('2020-01-01', '2024-12-31').select('BurnDate').max().gt(0).clip(aoi);
Map.addLayer(burned.selfMask(), {palette: ['orange']}, 'MODIS Burned 2020-2024');
areaHa(burned, 'BurnedArea_ha_2020_2024', 500);
// If ~0, fires are small/absent at 500 m. Finer option: FIRMS active fire (375 m).

// =====================================================
// 6) EXPORTS (Drive -> SEEA_AI_VALIDATION)   — large AOI: exports are tiled
// =====================================================
function exp(img, name, scale) {
  Export.image.toDrive({image: img, description: name, folder: 'SEEA_AI_VALIDATION',
    region: aoi, scale: scale, maxPixels: 1e13});
}
exp(m2020.select(['B4', 'B3', 'B2']), 'Sinu_S2_RGB_2020', 10);
exp(m2024.select(['B4', 'B3', 'B2']), 'Sinu_S2_RGB_2024', 10);
exp(ndvi2020, 'Sinu_S2_NDVI_2020', 10);
exp(ndvi2024, 'Sinu_S2_NDVI_2024', 10);
exp(dNDVI,    'Sinu_S2_dNDVI_2020_2024', 10);
exp(hansenLoss,     'Sinu_HansenLoss_2020_2024', 30);
exp(raddConfirmed,  'Sinu_RADDalerts_2020_2024', 30);
exp(burned,         'Sinu_Burned_2020_2024', 500);
