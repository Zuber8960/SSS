const express = require('express');
const router = express.Router();
const PincodeController = require('./pincodeMaster.controller');

// GET /api/pincodeMaster?pincode=500001&state_name=...&district=...
// Returns pincode rows matching any/all provided query filters.
router.get('/', async (req, res) => {
  try {
    const data = await PincodeController.getPincodeData(req.query);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('PincodeMaster error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving pincode data' });
  }
});

// GET /api/pincodeMaster/byPincode/:pincode
// Returns the first row matching the exact pincode.
router.get('/byPincode/:pincode', async (req, res) => {
  try {
    const data = await PincodeController.getPincodeByPincode(req.params.pincode);
    if (!data) return res.status(404).json({ success: false, message: 'Pincode not found' });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('PincodeMaster error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving pincode data' });
  }
});

// GET /api/pincodeMaster/states
// Returns distinct states from the pincode master table.
router.get('/states', async (req, res) => {
  try {
    const data = await PincodeController.getDistinctStates();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('PincodeMaster error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving states' });
  }
});

// GET /api/pincodeMaster/districts?state_name=...
// Returns distinct districts, optionally filtered by state.
router.get('/districts', async (req, res) => {
  try {
    const data = await PincodeController.getDistrictsByState(req.query.state_name);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('PincodeMaster error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving districts' });
  }
});

module.exports = router;