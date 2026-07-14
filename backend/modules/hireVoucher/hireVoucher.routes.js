const express = require('express');
const router = express.Router();
const HireVoucherController = require('./hireVoucher.controller');
const db = require('../../config/db');

/* ================= LIST ================= */

router.get('/', async (req, res) => {
  try {
    const data = await HireVoucherController.getAllHireVouchers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET BY KEY ================= */

router.get('/:no/:loc/:date', async (req, res) => {
  try {
    const { no, loc, date } = req.params;
    const data = await HireVoucherController.getHireVoucherByKey({
      hv_no: no,
      hv_loc: loc,
      hv_date: date
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET BY NO ONLY (for edit/view) ================= */

router.get('/by-no/:no', async (req, res) => {
  try {
    const { no } = req.params;
    const header = await HireVoucherController.getHireVoucherByNo(no);
    if (!header) {
      return res.status(404).json({ success: false, message: 'Hire Voucher not found' });
    }
    const details = await HireVoucherController.getHireVoucherDetails({
      hv_no: header.hv_no,
      hv_loc: header.hv_loc || header.from_loc,
      hv_date: header.hv_date
    });
    res.json({ success: true, data: { header, details } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET NEXT HIRE VOUCHER NO ================= */

router.get('/next-no', async (req, res) => {
  try {
    const nextNo = await HireVoucherController.getNextHireVoucherNo();
    res.json({ success: true, data: { hv_no: nextNo } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CREATE (header + details in transaction) ================= */

router.post('/', async (req, res) => {
  try {
    const { header, details } = req.body;
    if (!header) {
      return res.status(400).json({ success: false, message: 'Header data is required' });
    }
    const result = await HireVoucherController.createHireVoucher(header, details || []);
    res.status(201).json({
      success: true,
      message: 'Hire Voucher saved successfully',
      data: { hv_no: result.hv_no }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/* ================= UPDATE (header + details) ================= */

router.put('/:no/:loc/:date', async (req, res) => {
  try {
    const { no, loc, date } = req.params;
    const { header, details } = req.body;
    const keys = { hv_no: no, hv_loc: loc, hv_date: date };

    // Update header
    if (header && Object.keys(header).length > 0) {
      await HireVoucherController.updateHireVoucher(keys, header);
    }

    // Update details (delete all + re-insert)
    if (details && details.length > 0) {
      await HireVoucherController.updateHireVoucherDetails(keys, details);
    }

    res.json({ success: true, message: 'Hire Voucher updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE ================= */

router.delete('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    await HireVoucherController.deleteHireVoucher({
      hv_no: no, hv_loc: loc, hv_date: date
    }, trx);
    await trx.commit();
    res.json({ success: true, message: 'Hire Voucher deleted successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET BY VHV NO ================= */

router.get('/by-vhv-no/:vhvNo', async (req, res) => {
  try {
    const { vhvNo } = req.params;
    const data = await HireVoucherController.getHireVoucherByVhvNo(vhvNo);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Hire Voucher not found for this VHV No' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET VENDOR BY LORRY NO ================= */

router.get('/vendor/:lorryNo', async (req, res) => {
  try {
    const { lorryNo } = req.params;
    const data = await HireVoucherController.getVendorByLorryNo(lorryNo);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;