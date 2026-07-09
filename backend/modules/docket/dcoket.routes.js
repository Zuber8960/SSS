// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const DocketController = require('./docket.controller');
const db = require('../../config/db');
const ewb = require('../../config/ewb');

/* ================= EWAYBILL EXTERNAL API ================= */

router.get('/ewayBill', async (req, res) => {
  try {
    const { ewbNo } = req.query;
    const data = await DocketController.getEwaybillDetails(ewbNo);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/ewbDetails/:ewbLists', async (req, res) => {
  try {
    const ewbLists = req.params.ewbLists?.split(',').map(Number);
    let data = await DocketController.getListEwayDetails(ewbLists);
    if (data.find(d => d.data)) {
      return res.status(200).json({ success: true, data });
    }
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= EWAYBILL DB ROUTES ================= */

router.get('/ewayfile/db', async (req, res) => {
  try {
    const { company_code } = req;
    const query = db('sss.sst_docket_ewb').select('*').orderBy('aud_date', 'desc');
    if (company_code) query.where({ company_code });
    const data = await query;
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/ewayfile/db/:ewbNumbers', async (req, res) => {
  try {
    const ewbNumbers = req.params.ewbNumbers?.split(',').map(s => s.trim()).filter(Boolean).map(Number);
    if (!ewbNumbers?.length) {
      return res.json({ success: true, data: [] });
    }
    const { company_code } = req;
    const data = await DocketController.getEwayBillFromDB(ewbNumbers, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/ewayfile/db', async (req, res) => {
  try {
    const { company_code } = req;
    const ewbData = req.body;
    if (!Array.isArray(ewbData) || !ewbData.length) {
      return res.status(400).json({ success: false, message: 'Ewaybill data array is required' });
    }
    const data = await DocketController.saveEwayBillToDB(ewbData, company_code);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CHARGES ROUTES ================= */

router.get('/charges/:chargeId', async (req, res) => {
  try {
    const { chargeId } = req.params;
    const { company_code } = req;
    const data = await DocketController.getChargesByDocketId(chargeId, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/charges/:chargeId', async (req, res) => {
  try {
    const { chargeId } = req.params;
    const { company_code } = req;
    const chargeData = req.body;
    const data = await DocketController.updateCharge(chargeId, chargeData, db, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/charges/:chargeId', async (req, res) => {
  try {
    const { chargeId } = req.params;
    const { company_code } = req;
    const data = await DocketController.deleteCharge(chargeId, db, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:docketId/charges', async (req, res) => {
  try {
    const { docketId } = req.params;
    const { company_code } = req;
    const data = await DocketController.getChargesByDocketId(docketId, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:docketId/charges', async (req, res) => {
  try {
    const { docketId } = req.params;
    const { company_code } = req;
    const chargeData = { ...req.body, company_code: req.body.company_code || company_code };
    const data = await DocketController.createCharge(docketId, chargeData);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LIST ================= */

router.get('/', async (req, res) => {
  try {
    const { company_code } = req;
    const data = await DocketController.getAllDockets(company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET BY SINGLE DOCKET NUMBER ================= */

router.get('/:no', async (req, res) => {
  try {
    const { no } = req.params;
    const { company_code } = req;
    const data = await DocketController.getDocketByNo(no, company_code);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:no/:loc/:date', async (req, res) => {
  try {
    const { no, loc, date } = req.params;
    const { company_code } = req;
    const header = await DocketController.getDocketById({ docket_no: no, docket_loc: loc, docket_date: date }, company_code);
    const details = await DocketController.getDocketDetails({ docket_no: no, docket_loc: loc, docket_date: date }, company_code);
    res.json({ success: true, header, details });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CREATE ================= */

router.post('/', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { company_code } = req;
    const { header, details } = req.body;
    const headerWithCompany = { ...header, company_code: header.company_code || company_code };
    await DocketController.createDocket(headerWithCompany, trx);
    if (details?.length) {
      const rows = details.map(d => ({
        ...d,
        docket_no: header.docket_no,
        docket_loc: header.docket_loc,
        docket_date: header.docket_date,
        company_code: d.company_code || company_code,
        aud_date: new Date()
      }));
      await DocketController.createDocketDetails(rows, trx);
    }
    await trx.commit();
    res.status(201).json({ success: true, message: 'Docket saved successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= UPDATE ================= */

router.put('/:no', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no } = req.params;
    const { company_code } = req;
    const { header, details } = req.body;
    const payload = header || req.body;

    const existing = await DocketController.getAllDockets(company_code).then(dockets =>
      dockets.find(d => String(d.docket_no) === String(no))
    );

    if (!existing) {
      await trx.rollback();
      return res.status(404).json({ success: false, message: 'Docket not found' });
    }

    const keys = { docket_no: existing.docket_no, docket_loc: existing.docket_loc };
    await DocketController.updateDocket(keys, payload, trx);
    await DocketController.deleteDocketDetails(keys, trx);

    if (details?.length) {
      const rows = details.map(d => ({ ...d, ...keys, company_code: d.company_code || company_code, aud_date: new Date() }));
      await DocketController.createDocketDetails(rows, trx);
    }

    await trx.commit();
    res.json({ success: true, message: 'Docket updated successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    const { company_code } = req;
    const { header, details } = req.body;
    const keys = { docket_no: no, docket_loc: loc, docket_date: date };
    await DocketController.updateDocket(keys, header, trx);
    await DocketController.deleteDocketDetails(keys, trx);
    if (details?.length) {
      const rows = details.map(d => ({ ...d, ...keys, company_code: d.company_code || company_code, aud_date: new Date() }));
      await DocketController.createDocketDetails(rows, trx);
    }
    await trx.commit();
    res.json({ success: true, message: 'Docket updated successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE ================= */

router.delete('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    const { company_code } = req;
    await DocketController.deleteDocket({ docket_no: no, docket_loc: loc, docket_date: date, company_code }, trx);
    await trx.commit();
    res.json({ success: true, message: 'Docket deleted successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
