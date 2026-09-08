const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
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

/* ================= PUBLIC POD FILE ================= */
// Serves POD files through the /app API path so they work in production where
// only /app is proxied to the backend (static /uploads is NOT reachable there).
// Filenames are server-generated (pod_<ts>_<rand>.<ext>) — path traversal is blocked.
const POD_DIR = path.join(__dirname, '..', 'uploads', 'pod');
const POD_MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".gif": "image/gif", ".webp": "image/webp", ".bmp": "image/bmp",
  ".heic": "image/heic", ".heif": "image/heif", ".pdf": "application/pdf",
};

router.get('/pod-file/:filename', (req, res) => {
  const filename = path.basename(req.params.filename); // strips any path traversal
  const filePath = path.join(POD_DIR, filename);
  if (!/^pod_.+$/i.test(filename) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return res.status(404).json({ success: false, message: 'POD file not found' });
  }
  res.setHeader('Content-Type', POD_MIME[path.extname(filename).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.sendFile(filePath);
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
