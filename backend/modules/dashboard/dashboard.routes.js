const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('./dashboard.controller');

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

module.exports = router;
