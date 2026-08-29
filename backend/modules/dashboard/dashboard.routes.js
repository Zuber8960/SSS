const express = require('express');
const router = express.Router();
const { getDashboardStats, getInTransitVehicleLocations, getInTransitDockets } = require('./dashboard.controller');

router.get('/stats', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    const data = await getDashboardStats(tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard stats' });
  }
});

router.get('/in-transit-vehicle-locations', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    const data = await getInTransitVehicleLocations(tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('In-transit vehicle locations error:', error);
    res.status(500).json({ success: false, message: 'Error fetching vehicle locations' });
  }
});

router.get('/in-transit-dockets', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    const data = await getInTransitDockets(tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('In-transit dockets error:', error);
    res.status(500).json({ success: false, message: 'Error fetching in-transit dockets' });
  }
});

module.exports = router;
