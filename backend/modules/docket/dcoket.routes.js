// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const DocketController = require('./docket.controller');
const db = require('../../config/db');

router.get('/', async (req, res) => {
  try {
    const data = await DocketController.getAllDockets();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:no/:loc/:date', async (req, res) => {
  try {
    const { no, loc, date } = req.params;
    const header = await DocketController.getDocketById({
      docket_no: no,
      docket_loc: loc,
      docket_date: date
    });
    const details = await DocketController.getDocketDetails({
      docket_no: no,
      docket_loc: loc,
      docket_date: date
    });
    res.json({ success: true, header, details });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CREATE ================= */

router.post('/', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { header, details } = req.body;
    await DocketController.createDocket(header, trx);
    // insert details
    if (details?.length) {
      const rows = details.map(d => ({
        ...d,
        docket_no: header.docket_no,
        docket_loc: header.docket_loc,
        docket_date: header.docket_date,
        aud_date: new Date()
      }));
      await DocketController.createDocketDetails(rows, trx);
    }
    await trx.commit();
    res.status(201).json({
      success: true,
      message: 'Docket saved successfully'
    });

  } catch (err) {
    await trx.rollback();

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/* ================= UPDATE ================= */

router.put('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    const { header, details } = req.body;
    const keys = {
      docket_no: no,
      docket_loc: loc,
      docket_date: date
    };
    await DocketController.updateDocket(keys, header, trx);

    // delete old details
    await DocketController.deleteDocketDetails(keys, trx);

    // insert new details
    if (details?.length) {
      const rows = details.map(d => ({
        ...d,
        ...keys,
        aud_date: new Date()
      }));

      await DocketController.createDocketDetails(rows, trx);
    }
    await trx.commit();
    res.json({
      success: true,
      message: 'Docket updated successfully'
    });

  } catch (err) {
    await trx.rollback();

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

/* ================= DELETE ================= */

router.delete('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
    const { no, loc, date } = req.params;
    await DocketController.deleteDocket({
      docket_no: no,
      docket_loc: loc,
      docket_date: date
    }, trx);
    await trx.commit();
    res.json({
      success: true,
      message: 'Docket deleted successfully'
    });
  } catch (err) {
    await trx.rollback();

    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});

module.exports = router;