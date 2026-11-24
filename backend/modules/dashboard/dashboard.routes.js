const express = require('express');
const router = express.Router();
const { getDashboardStats, getDashboardOverview, getInTransitVehicleLocations, getInTransitDockets, getOrderBoard, getOrderDockets, getDespatchBoard, getDespatchDockets, getVehicleBoard, getVehicleTrips, getDeliveryBoard, getDeliveryDockets, getRevenueBoard, getRevenueDockets, getCollectionBoard, getCollectionBills, getCollectionReceipts, getOutstandingBoard, getOutstandingBills, getHireBoard, getHireVouchers, getEwbBoard, getEwbBills } = require('./dashboard.controller');

router.get('/overview', async (req, res) => {
  try {
    const tenant_id = req.tenant_id;
    const data = await getDashboardOverview(tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ success: false, message: 'Error fetching dashboard overview' });
  }
});

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

router.get('/orders', async (req, res) => {
  try {
    const data = await getOrderBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard orders error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order board' });
  }
});

router.get('/orders/dockets', async (req, res) => {
  try {
    const data = await getOrderDockets(req.tenant_id, {
      period: req.query.period,
      lane: req.query.lane,
      slice: req.query.slice,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard order dockets error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching order dockets' });
  }
});

router.get('/despatches', async (req, res) => {
  try {
    const data = await getDespatchBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard despatches error:', error);
    res.status(500).json({ success: false, message: 'Error fetching despatch board' });
  }
});

router.get('/despatches/dockets', async (req, res) => {
  try {
    const data = await getDespatchDockets(req.tenant_id, {
      period: req.query.period,
      lane: req.query.lane,
      slice: req.query.slice,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard despatch dockets error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching despatch dockets' });
  }
});

router.get('/vehicles', async (req, res) => {
  try {
    const data = await getVehicleBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard vehicles error:', error);
    res.status(500).json({ success: false, message: 'Error fetching vehicle board' });
  }
});

router.get('/vehicles/trips', async (req, res) => {
  try {
    const data = await getVehicleTrips(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard vehicle trips error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching vehicle trips' });
  }
});

router.get('/deliveries', async (req, res) => {
  try {
    const data = await getDeliveryBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard deliveries error:', error);
    res.status(500).json({ success: false, message: 'Error fetching delivery board' });
  }
});

router.get('/deliveries/dockets', async (req, res) => {
  try {
    const data = await getDeliveryDockets(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard delivery dockets error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching delivery dockets' });
  }
});

router.get('/revenue', async (req, res) => {
  try {
    const data = await getRevenueBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard revenue error:', error);
    res.status(500).json({ success: false, message: 'Error fetching revenue board' });
  }
});

router.get('/collection', async (req, res) => {
  try {
    const data = await getCollectionBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard collection error:', error);
    res.status(500).json({ success: false, message: 'Error fetching collection board' });
  }
});

router.get('/collection/bills', async (req, res) => {
  try {
    const data = await getCollectionBills(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard collection bills error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching collection bills' });
  }
});

router.get('/outstanding', async (req, res) => {
  try {
    const data = await getOutstandingBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard outstanding error:', error);
    res.status(500).json({ success: false, message: 'Error fetching outstanding breakup' });
  }
});

router.get('/outstanding/bills', async (req, res) => {
  try {
    const data = await getOutstandingBills(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard outstanding bills error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching outstanding bills' });
  }
});

router.get('/hire', async (req, res) => {
  try {
    const data = await getHireBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard lorry hire error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lorry hire' });
  }
});

router.get('/hire/vouchers', async (req, res) => {
  try {
    const data = await getHireVouchers(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard hire vouchers error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching hire vouchers' });
  }
});

router.get('/ewb', async (req, res) => {
  try {
    const data = await getEwbBoard(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard e-way bill error:', error);
    res.status(500).json({ success: false, message: 'Error fetching e-way bill expiry' });
  }
});

router.get('/ewb/bills', async (req, res) => {
  try {
    const data = await getEwbBills(req.tenant_id, { slice: req.query.slice, side: req.query.side });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard e-way bills error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching e-way bills' });
  }
});

router.get('/collection/receipts', async (req, res) => {
  try {
    const data = await getCollectionReceipts(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard collection receipts error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching collection receipts' });
  }
});

router.get('/revenue/dockets', async (req, res) => {
  try {
    const data = await getRevenueDockets(req.tenant_id, { period: req.query.period, slice: req.query.slice });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Dashboard revenue dockets error:', error);
    const status = error.status || 500;
    res.status(status).json({ success: false, message: status === 400 ? error.message : 'Error fetching revenue dockets' });
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
