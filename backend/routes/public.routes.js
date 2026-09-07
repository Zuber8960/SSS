const express = require('express');
const router = express.Router();
const LocationMasterController = require('../modules/locationMaster/locationMaster.controller');
const DocketController = require('../modules/docket/docket.controller');
const ManifestController = require('../modules/manifest/manifest.controller');

/* ================= PUBLIC LOCATIONS ================= */

router.get('/locations', async (req, res) => {
  try {
    const data = await LocationMasterController.getAllLocationData(null, null);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Public locations error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving location data' });
  }
});

/* ================= PUBLIC DOCKET ================= */

router.get('/docket/:docketNo', async (req, res) => {
  try {
    const data = await DocketController.getDocketByRecId(null, null, req.params.docketNo);
    if (data) res.json({ success: true, data });
    else res.status(404).json({ success: false, message: 'Docket not found' });
  } catch (error) {
    console.error('Public docket error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving docket' });
  }
});

/* ================= PUBLIC MANIFEST BY DOCKET ================= */

router.get('/manifest/by-docket/:docketNo', async (req, res) => {
  try {
    const data = await ManifestController.getManifestsByDocketNo(req.params.docketNo);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Public manifest error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving manifests' });
  }
});

/* ================= PUBLIC VEHICLE TRACKING ================= */

router.get('/manifest/tracking/:vehicleNo', async (req, res) => {
  try {
    const data = await ManifestController.getVehicleTrackingData(req.params.vehicleNo);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error retrieving tracking data' });
  }
});

/* ================= PUBLIC TOWN COORDINATES ================= */

router.post('/town/coordinates', async (req, res) => {
  try {
    const { townNames } = req.body;
    const data = await LocationMasterController.getTownCoordinates(townNames);
    res.json({ success: true, data });
  } catch (error) {
    console.error('Public town coordinates error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving town coordinates' });
  }
});

module.exports = router;
