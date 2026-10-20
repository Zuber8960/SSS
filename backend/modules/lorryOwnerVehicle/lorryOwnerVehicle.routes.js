const express = require('express');
const router = express.Router();
const LorryOwnerVehicle = require('./lorryOwnerVehicle.controller');

function sendError(res, error, fallback) {
  const status = error.status || 500;
  console.error('Lorry Owner Vehicle error:', error);
  res.status(status).json({ success: false, message: error.message || fallback });
}

router.get('/owners', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.listOwners(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error retrieving lorry owners');
  }
});

router.get('/attached', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.listAttached(req.tenant_id, req.query.owner_bp_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error retrieving attached vehicles');
  }
});

router.get('/by-vehicle/:vehicleNo', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.getOwnerByVehicle(req.tenant_id, req.params.vehicleNo);
    res.status(200).json({ success: true, data: data || null });
  } catch (error) {
    sendError(res, error, 'Error retrieving vehicle owner');
  }
});

router.get('/available', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.listAvailable(req.tenant_id, req.query.owner_bp_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error retrieving available vehicles');
  }
});

router.post('/attach', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.attach(req.user, req.tenant_id, req.body || {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error attaching vehicles');
  }
});

router.post('/detach', async (req, res) => {
  try {
    const data = await LorryOwnerVehicle.detach(req.user, req.tenant_id, req.body || {});
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error detaching vehicles');
  }
});

module.exports = router;
