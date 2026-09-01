const express = require('express');
const router = express.Router();
const ManifestController = require('./manifest.controller');
const db = require('../../config/db');

/* ================= LIST ================= */

router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req;
    const data = await ManifestController.getAllManifests(tenant_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET BY KEY ================= */

router.get('/:no/:loc/:date', async (req, res) => {
  try {
    const { no, loc, date } = req.params;
    const data = await ManifestController.getManifestByKey({
      mnf_no: no,
      mnf_loc: loc,
      mnf_date: date
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
    const header = await ManifestController.getManifestByNo(no);
    if (!header) {
      return res.status(404).json({ success: false, message: 'Manifest not found' });
    }
    const details = await ManifestController.getManifestDetails({
      mnf_no: header.mnf_no,
      mnf_loc: header.mnf_loc,
      mnf_date: header.mnf_date
    });
    res.json({ success: true, data: { header, details } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET MANIFESTS BY DOCKET NO ================= */

router.get('/by-docket/:docketNo', async (req, res) => {
  try {
    const { docketNo } = req.params;
    const data = await ManifestController.getManifestsByDocketNo(docketNo);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= GET NEXT MANIFEST NO ================= */

router.get('/by-location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    const loc = await ManifestController.getManifestByLocation(location);
    res.json({ success: true, data:  loc });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= CREATE (header + details in transaction) ================= */

router.post('/', async (req, res) => {
  try {
    const { tenant_id } = req;
    const { header, details } = req.body;
    if (!header) {
      return res.status(400).json({ success: false, message: 'Header data is required' });
    }
    if (!details || !details.length) {
      return res.status(400).json({ success: false, message: 'At least one docket detail is required' });
    }
    const result = await ManifestController.createManifest({ ...header, tenant_id }, details);
    res.status(201).json({
      success: true,
      message: 'Manifest saved successfully',
      data: { mnf_no: result.mnf_no }
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
    const keys = { mnf_no: no, mnf_loc: loc, mnf_date: date };

    // Update header
    if (header && Object.keys(header).length > 0) {
      await ManifestController.updateManifest(keys, header);
    }

    // Update details (delete all + re-insert)
    if (details && details.length > 0) {
      await ManifestController.updateManifestDetails(keys, details);
    }

    res.json({ success: true, message: 'Manifest updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= UNLOADING (save to unloading_dtl table) ================= */

const UnloadingController = require('./unloading.controller');

router.post('/unloading', async (req, res) => {
  try {
    const body = req.body;
    if (!body.dockets || !body.dockets.length) {
      return res.status(400).json({ success: false, message: 'No docket data provided for unloading' });
    }
    const result = await UnloadingController.saveUnloading(body);
    res.status(201).json({ success: true, message: 'Unloading saved successfully', data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= DELETE ================= */

router.delete('/:no/:loc/:date', async (req, res) => {
  const trx = await db.transaction();
  try {
     const { tenant_id } = req;
    const { no, loc, date } = req.params;
    await ManifestController.deleteManifest({
      mnf_no: no, mnf_loc: loc, mnf_date: date, tenant_id
    }, trx);
    await trx.commit();
    res.json({ success: true, message: 'Manifest deleted successfully' });
  } catch (err) {
    await trx.rollback();
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;