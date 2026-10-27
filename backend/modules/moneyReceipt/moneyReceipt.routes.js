const express = require('express');
const router = express.Router();
const ctrl = require('./moneyReceipt.controller');

router.get('/banks', async (req, res) => {
  try {
    const data = await ctrl.listBanks();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/outstanding', async (req, res) => {
  try {
    const data = await ctrl.getOutstandingInvoices({
      loc_code: req.query.loc_code || req.loc_code,
      bp_code: req.query.bp_code,
      bp_name: req.query.bp_name,
      company_code: req.tenant_id || null,
    });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/by-number/:mrNo', async (req, res) => {
  try {
    const loc = req.query.loc_code || req.loc_code;
    const data = await ctrl.getByNumber(req.params.mrNo, loc);
    if (!data) return res.status(404).json({ success: false, message: `Receipt ${req.params.mrNo} not found for this branch` });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user?.user_id || req.user?.userId || null;
    const data = await ctrl.saveReceipt(req.body, req.tenant_id || null, userId);
    res.status(201).json({ success: true, message: 'Money receipt saved', data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete('/:mrNo/:mrDate/:locCode', async (req, res) => {
  try {
    const deleted = await ctrl.deleteReceipt(req.params.mrNo, req.params.mrDate, req.params.locCode);
    if (!deleted) return res.status(404).json({ success: false, message: 'Receipt not found' });
    res.json({ success: true, message: 'Money receipt deleted' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
