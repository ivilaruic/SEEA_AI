// =====================================================
// SEEA-AI | RANDOM FOREST (regression) — aboveground biomass carbon
// Labels: NASA/ORNL biomass_carbon_density (agb, tC/ha)
// Train & validate on MURRAY-DARLING  ->  transfer to ALTO MADRE DE DIOS
// Same flag convention as rf_biomass_mdb_to_sinu.js (ADD_SINU_TRAINING):
// one file, ADD_MDD_TRAINING = false/true, instead of separate rf_true/rf_false.
// =====================================================
// EXTRAPOLATION CAVEAT: as with the Sinú, a Random Forest trained only on
// the semi-arid MDB (AGB < 60 tC/ha) will strongly underestimate Amazonian
// biomass in Madre de Dios (~165 tC/ha expected, Baccini et al. 2012).
// Setting ADD_MDD_TRAINING = true matters even more here than for the Sinú,
// or the output will fall far below the real range.
// =====================================================
var ADD_MDD_TRAINING = true;   // keep TRUE for Madre de Dios (see caveat above)

// ----- AOIs -----
var mdb = ee.FeatureCollection('projects/seea-ai/assets/mdb_boundary');

// FIX (post first run): MAIN_BAS groups ALL sub-basins draining to the same
// terminal outlet. The Sinú is a standalone coastal basin, so MAIN_BAS
// correctly returned just the Sinú. Madre de Dios is a TRIBUTARY of the
// Amazon mainstem, so MAIN_BAS pulled in the entire upstream Amazon network
// (~5.9M km2 printed on the first run) -> every sample()/reduceRegion() call
// downstream timed out.
// Fix: use Pfafstetter-code (PFAF_ID) prefix matching on the finer hybas_8
// level instead of MAIN_BAS grouping, to select just the local Alto Madre de
// Dios sub-catchment around the seed point.
var hb8 = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_8')
  .map(function (f) { return f.set('PFAF_STR', ee.Number(f.get('PFAF_ID')).format()); });
var mddSeed = ee.Feature(hb8.filterBounds(ee.Geometry.Point([-71.0, -12.8])).first());
var seedPfaf = ee.String(mddSeed.get('PFAF_STR'));

// TODO (verify/tune): PREFIX_LEN controls how many leading Pfafstetter digits
// must match to be included. Longer prefix -> smaller, more local selection.
// Run 1 (PREFIX_LEN=6) printed 125,554 km2 — still ~8x the target, so one
// more digit is needed (each extra digit roughly divides area by ~10). If 7
// overshoots below target, drop back to 6 mixed with a manual sub-filter, or
// try 8.
var PREFIX_LEN = 7;
var seedPrefix = seedPfaf.slice(0, PREFIX_LEN);
var mdd = hb8.filter(ee.Filter.stringStartsWith('PFAF_STR', seedPrefix));
print('MdD candidate area km2 (target ~15,600) — tune PREFIX_LEN if off by a lot',
  mdd.geometry().area(1).divide(1e6));

// ----- Cloud-masked Sentinel-2 mean composite (identical to rf_true) -----
var CSPLUS = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
function s2mean(aoi, start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi).filterDate(start, end)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 60))
    .linkCollection(CSPLUS, ['cs_cdf'])
    .map(function (i) {
      return i.updateMask(i.select('cs_cdf').gte(0.6))
        .select(['B2', 'B3', 'B4', 'B8', 'B11', 'B12']).divide(10000);
    }).mean();
}

// ----- Predictor stack (identical) -----
var DEM = ee.Image('USGS/SRTMGL1_003');
function predictors(aoi, s2s, s2e, ps, pe) {
  var c = s2mean(aoi, s2s, s2e);
  var precip = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY')
    .filterDate(ps, pe).select('precipitation').sum().rename('precip');
  return c
    .addBands(c.normalizedDifference(['B8', 'B4']).rename('NDVI'))
    .addBands(c.normalizedDifference(['B3', 'B11']).rename('NDWI'))
    .addBands(c.normalizedDifference(['B8', 'B12']).rename('NBR'))
    .addBands(DEM.rename('elev'))
    .addBands(ee.Terrain.slope(DEM).rename('slope'))
    .addBands(precip);
}
var PRED = ['B2', 'B3', 'B4', 'B8', 'B11', 'B12', 'NDVI', 'NDWI', 'NBR',
            'elev', 'slope', 'precip'];

// ----- Label -----
var agb = ee.ImageCollection('NASA/ORNL/biomass_carbon_density/v1').first()
  .select('agb').rename('agb');

// ----- Training data on Murray-Darling (identical) -----
var predMDB = predictors(mdb.geometry(), '2018-12-01', '2019-02-28',
                         '2018-07-01', '2019-06-30');
var sampMDB = predMDB.addBands(agb).clip(mdb).sample({
  region: mdb.geometry(), scale: 1000, numPixels: 3000, seed: 42,
  tileScale: 16, dropNulls: true}).randomColumn('rnd', 42);
var train = sampMDB.filter(ee.Filter.lt('rnd', 0.7));
var test  = sampMDB.filter(ee.Filter.gte('rnd', 0.7));     // held-out, MDB only

// Wet-tropical training window for Madre de Dios. The Sinú uses Dec-Mar
// (Caribbean dry season); southwestern Amazonia's DRY season is Jun-Sep
// (austral winter). Jun-Sep is used here; adjust if your own compositing
// criteria differ.
if (ADD_MDD_TRAINING) {
  var sampM = predictors(mdd.geometry(), '2023-06-01', '2023-09-30',
                         '2022-10-01', '2023-09-30')
    .addBands(agb).clip(mdd).sample({region: mdd.geometry(), scale: 1000,
      numPixels: 3000, seed: 11, tileScale: 16, dropNulls: true});
  train = train.merge(sampM);
}
print('train n', train.size(), 'test n (MDB)', test.size());

// ----- Train Random Forest (identical) -----
var rf = ee.Classifier.smileRandomForest(200).setOutputMode('REGRESSION')
  .train({features: train, classProperty: 'agb', inputProperties: PRED});

// ----- Validate on held-out MDB test: R2 and RMSE (identical) -----
var meanObs = ee.Number(test.aggregate_mean('agb'));
var pr = test.classify(rf, 'pred').map(function (f) {
  var o = ee.Number(f.get('agb')), p = ee.Number(f.get('pred'));
  return f.set('res2', o.subtract(p).pow(2)).set('tot2', o.subtract(meanObs).pow(2));
});
var ssRes = ee.Number(pr.aggregate_sum('res2'));
var ssTot = ee.Number(pr.aggregate_sum('tot2'));
print('RF R2 (test, MDB)', ee.Number(1).subtract(ssRes.divide(ssTot)));
print('RF RMSE tC/ha (test)', ssRes.divide(test.size()).sqrt());
// Variable importance dropped: rf.explain() on the merged MDB+MdD training
// set hit "Earth Engine memory capacity exceeded" without affecting R2/RMSE/
// AGB above. Not needed for the paper's results; uncomment only if you want
// to try it standalone (fewer trees or a separate run).
// print('RF variable importance', rf.explain().get('importance'));

// ----- Predict (tCO2/ha) -----
var TCO2 = 44 / 12;

// ----- TRANSFER to Madre de Dios (2020 and 2024 -> carbon stock change) -----
var agbM20 = predictors(mdd.geometry(), '2020-06-01', '2020-09-30',
  '2019-10-01', '2020-09-30').classify(rf).rename('c').multiply(TCO2).clip(mdd);
var agbM24 = predictors(mdd.geometry(), '2023-06-01', '2023-09-30',
  '2022-10-01', '2023-09-30').classify(rf).rename('c').multiply(TCO2).clip(mdd);
var dAGB_M = agbM24.subtract(agbM20).rename('dAGB');
// FIX (post first run): actual basin AGB ~= 410 tCO2/ha, but this was
// visualized with max=250 (copied from the Sinú script, where AGB ~= 130-140
// fits fine under 250) -> the whole map would render as solid saturated
// dark green with no visible contrast. Rescaled to fit Madre de Dios's own
// range (~350-500 tCO2/ha spread around the observed 409.8-414.0 mean).
Map.addLayer(agbM24, {min: 300, max: 500, palette: ['white', 'darkgreen']},
  'RF AGB Madre de Dios 2024 (tCO2/ha)');
Map.addLayer(dAGB_M, {min: -20, max: 20, palette: ['red', 'white', 'green']},
  'RF dAGB Madre de Dios 2020-2024', false);
Map.centerObject(mdd, 8);

// ----- Basin means -----
function m(img, fc, name) {
  print(name, img.reduceRegion({reducer: ee.Reducer.mean(), geometry: fc.geometry(),
    scale: 500, maxPixels: 1e13, bestEffort: true, tileScale: 16}).values().get(0));
}
m(agbM20, mdd, 'RF_AGB_MdD_2020_tCO2_ha');
m(agbM24, mdd, 'RF_AGB_MdD_2024_tCO2_ha (expected ~165 tC/ha *44/12 ~= 605 tCO2/ha dense biomass; sanity-check order of magnitude)');
m(dAGB_M, mdd, 'RF_dAGB_MdD_2020_2024_tCO2_ha');

// ----- Exports (added for Figura 7 — biomass map, mirrors Figura 2 for Sinú) -----
// Previously missing: this script only rendered layers on the map and printed
// basin means, with no GeoTIFF export. Needed so the AGB/dAGB maps can be
// pulled into the paper the same way the S2/Hansen/mining maps were.
Export.image.toDrive({image: agbM24, description: 'MdD_RF_AGB_2024_tCO2ha',
  folder: 'SEEA_AI_VALIDATION', region: mdd.geometry(), scale: 500, maxPixels: 1e13});
Export.image.toDrive({image: dAGB_M, description: 'MdD_RF_dAGB_2020_2024_tCO2ha',
  folder: 'SEEA_AI_VALIDATION', region: mdd.geometry(), scale: 500, maxPixels: 1e13});
