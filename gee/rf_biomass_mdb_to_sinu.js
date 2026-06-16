// =====================================================
// SEEA-AI | RANDOM FOREST (regression) — aboveground biomass carbon
// Labels: NASA/ORNL biomass_carbon_density (agb, tC/ha)
// Train & validate on MURRAY-DARLING  ->  transfer to RÍO SINÚ
// =====================================================
// ⚠ EXTRAPOLATION CAVEAT: a Random Forest CANNOT predict beyond the range of its
// training labels. Trained only on semi-arid MDB (AGB mostly < 60 tC/ha) it will
// UNDERESTIMATE tropical forest biomass in the Sinú. For valid Sinú values set
// ADD_SINU_TRAINING = true (adds tropical samples), or train on a global sample.
// Temporal note: NASA/ORNL labels are a 2010 baseline; S2 predictors are 2018-24.
// =====================================================
var ADD_SINU_TRAINING = false;   // false = pure MDB->Sinú transfer demo (biased low)

// ----- AOIs -----
var mdb = ee.FeatureCollection('projects/seea-ai/assets/mdb_boundary');
var hb  = ee.FeatureCollection('WWF/HydroSHEDS/v1/Basins/hybas_7');
var sSeed = ee.Feature(hb.filterBounds(ee.Geometry.Point([-75.88, 8.75])).first());
var sinu  = hb.filter(ee.Filter.eq('MAIN_BAS', sSeed.get('MAIN_BAS')));

// ----- Cloud-masked Sentinel-2 MEAN composite -----
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

// ----- Predictor stack (identical recipe for every region/epoch) -----
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
  .select('agb').rename('agb');                            // tC/ha

// ----- Training data on Murray-Darling -----
var predMDB = predictors(mdb.geometry(), '2018-12-01', '2019-02-28',
                         '2018-07-01', '2019-06-30');
var sampMDB = predMDB.addBands(agb).clip(mdb).sample({
  region: mdb.geometry(), scale: 1000, numPixels: 3000, seed: 42,
  tileScale: 16, dropNulls: true}).randomColumn('rnd', 42);
var train = sampMDB.filter(ee.Filter.lt('rnd', 0.7));
var test  = sampMDB.filter(ee.Filter.gte('rnd', 0.7));     // held-out, MDB only

// Optional: add tropical (Sinú) samples so the model covers high biomass
if (ADD_SINU_TRAINING) {
  var sampS = predictors(sinu.geometry(), '2023-12-01', '2024-03-31',
                         '2023-07-01', '2024-06-30')
    .addBands(agb).clip(sinu).sample({region: sinu.geometry(), scale: 1000,
      numPixels: 3000, seed: 7, tileScale: 16, dropNulls: true});
  train = train.merge(sampS);
}
print('train n', train.size(), 'test n (MDB)', test.size());

// ----- Train Random Forest (regression) -----
var rf = ee.Classifier.smileRandomForest(200).setOutputMode('REGRESSION')
  .train({features: train, classProperty: 'agb', inputProperties: PRED});

// ----- Validate on held-out MDB test: R² and RMSE -----
var meanObs = ee.Number(test.aggregate_mean('agb'));
var pr = test.classify(rf, 'pred').map(function (f) {
  var o = ee.Number(f.get('agb')), p = ee.Number(f.get('pred'));
  return f.set('res2', o.subtract(p).pow(2)).set('tot2', o.subtract(meanObs).pow(2));
});
var ssRes = ee.Number(pr.aggregate_sum('res2'));
var ssTot = ee.Number(pr.aggregate_sum('tot2'));
print('RF R2 (test, MDB)', ee.Number(1).subtract(ssRes.divide(ssTot)));
print('RF RMSE tC/ha (test)', ssRes.divide(test.size()).sqrt());
print('RF variable importance', rf.explain().get('importance'));

// ----- Predict (tCO2/ha) -----
var TCO2 = 44 / 12;
var agbMDB = predMDB.classify(rf).rename('c').multiply(TCO2).clip(mdb);
Map.addLayer(agbMDB, {min: 0, max: 150, palette: ['white', 'green']},
  'RF AGB MDB (tCO2/ha)', false);

// ----- TRANSFER to Sinú (2020 & 2024 -> carbon stock change) -----
var agbS20 = predictors(sinu.geometry(), '2019-12-01', '2020-03-31',
  '2019-07-01', '2020-06-30').classify(rf).rename('c').multiply(TCO2).clip(sinu);
var agbS24 = predictors(sinu.geometry(), '2023-12-01', '2024-03-31',
  '2023-07-01', '2024-06-30').classify(rf).rename('c').multiply(TCO2).clip(sinu);
var dAGB = agbS24.subtract(agbS20).rename('dAGB');
Map.addLayer(agbS24, {min: 0, max: 200, palette: ['white', 'darkgreen']},
  'RF AGB Sinú 2024 (tCO2/ha)');
Map.addLayer(dAGB, {min: -50, max: 50, palette: ['red', 'white', 'green']},
  'RF ΔAGB Sinú 2020-2024', false);
Map.centerObject(sinu, 8);

// ----- Basin means -----
function m(img, fc, name) {
  print(name, img.reduceRegion({reducer: ee.Reducer.mean(), geometry: fc.geometry(),
    scale: 500, maxPixels: 1e13, bestEffort: true, tileScale: 16}).values().get(0));
}
m(agbMDB, mdb, 'RF_AGB_MDB_tCO2_ha  (NASA/ORNL ref = 48,0)');
m(agbS20, sinu, 'RF_AGB_Sinu_2020_tCO2_ha');
m(agbS24, sinu, 'RF_AGB_Sinu_2024_tCO2_ha');
m(dAGB,  sinu, 'RF_dAGB_Sinu_2020_2024_tCO2_ha');
