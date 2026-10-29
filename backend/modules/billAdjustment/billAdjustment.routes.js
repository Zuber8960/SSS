const express = require('express');
const router = express.Router();
const ctrl = require('./billAdjustment.controller');

const party = (req) => ({
  loc_code: req.query.loc_code || req.loc_code,
  bp_code: req.query.bp_code,
  bp_name: req.query.bp_name,
  bp_id: req.query.bp_id,
});

router.get('/receipts', async (req, res) => {
  try {
    const data = await ctrl.getOpenReceipts(party(req));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/bills', async (req, res) => {
  try {
    const data = await ctrl.getOpenBills(party(req));
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.userId || null;
    const data = await ctrl.saveAdjustment(req.body, req.tenant_id || null, userId);
    res.status(201).json({ success: true, message: 'Bill adjustment saved', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
