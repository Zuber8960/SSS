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
      vha_no: no,
      vha_loc: loc,
      vha_date: date
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
      vha_no: header.vha_no,
      vha_loc: header.vha_loc || header.from_loc,
      vha_date: header.vha_date
    });
    res.json({ success: true, data: { header, details } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET NEXT HIRE VOUCHER NO ================= */

router.get('/uncovered-manifests/:vehicleNo', async (req, res) => {
  try {
    const data = await HireVoucherController.getUncoveredManifestsByVehicle(
      req.params.vehicleNo,
      req.query.vha_no || null,
      req.query.from_loc || null
    );
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/next-no', async (req, res) => {
  try {
    const nextNo = await HireVoucherController.getNextHireVoucherNo();
    res.json({ success: true, data: { vha_no: nextNo } });
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
    const sessionHeader = {
      ...header,
      company_code: req.company_code ?? header.company_code,
      division_code: req.division_code ?? header.division_code,
      vha_loc: req.loc_code || header.vha_loc,
    };
    const result = await HireVoucherController.createHireVoucher(sessionHeader, details || []);
    res.status(201).json({
      success: true,
      message: 'Hire Voucher saved successfully',
      data: { vha_no: result.vha_no }
    });
  } catch (err) {
    res.status(err.status || 500).json({
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
    const keys = { vha_no: no, vha_loc: loc, vha_date: date };
    const selected = (Array.isArray(details) ? details : []).filter((r) => String(r?.mnf_no || '').trim());
    if (!selected.length) {
      return res.status(400).json({ success: false, message: 'Please select at least one manifest' });
    }
    const selectedActWt = selected.reduce((sum, r) => sum + (Number(r.mnf_act_weight) || 0), 0);
    const hireAmt = HireVoucherController.calcHireAmt(
      header?.vha_rate_uom,
      header?.vha_rate_per_uom,
      header?.vha_guarantee_weight
    );
    const loadingAmt = Number(header?.vha_loading_amt) || 0;
    const dcAmt = Number(header?.vha_dc_amt) || 0;
    const totalHire = hireAmt + loadingAmt + dcAmt;
    const advTotal = Number(header?.vha_advance_total) || 0;
    const tdsAmt = Number(header?.vha_tds_amt) || 0;
    const netAdvance = advTotal + tdsAmt;
    const balAmt = totalHire - netAdvance;
    const dtnAmt = Number(header?.vha_dtn_amt) || 0;
    const ddAmt = Number(header?.vha_dd_amt) || 0;
    const settleTds = Number(header?.vha_settle_tds_amt) || 0;
    const grossPayable = balAmt + dtnAmt + ddAmt;

    // Update header
    if (header && Object.keys(header).length > 0) {
      await HireVoucherController.updateHireVoucherWithSettlement(keys, {
        ...header,
        dwb_actual_weight: selectedActWt,
        vha_hire_amt: hireAmt,
        vha_total_amt: totalHire,
        vha_advance_net: netAdvance,
        vha_balance_amt: balAmt,
        vha_dtn_amt: dtnAmt,
        vha_dd_amt: ddAmt,
        vha_final_pay_date: header?.vha_final_pay_date || null,
        vha_settle_tds_amt: settleTds,
        vha_gross_payable: grossPayable,
        vha_net_payable: grossPayable - settleTds,
      });
    }

    // Update details (delete all + re-insert).
    // Must run even for an empty array, otherwise removing every manifest row
    // from the UI would silently leave the old rows in the database.
    if (Array.isArray(details)) {
      await HireVoucherController.updateHireVoucherDetails(keys, details);
    }

    res.json({ success: true, message: 'Hire Voucher updated successfully' });
  } catch (err) {
    res.status(err.status || 500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE ================= */

router.delete('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    await HireVoucherController.deleteHireVoucher({
      vha_no: no, vha_loc: loc, vha_date: date
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