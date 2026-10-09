const express = require('express');
const router = express.Router();
const DocketPreAlloc = require('./docketPreAlloc.controller');

function sendError(res, error, fallback) {
  const status = error.status || 500;
  if (status >= 500) console.error('Docket pre-allocation error:', error);
  res.status(status).json({ success: false, message: error.message || fallback });
}

router.get('/', async (req, res) => {
  try {
    const data = await DocketPreAlloc.list({
      used: req.query.used,
      loc_code: req.query.loc_code,
      customer_code: req.query.customer_code,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading pre-allocated dockets');
  }
});

router.get('/preview-auto', async (req, res) => {
  try {
    const data = await DocketPreAlloc.previewAuto({
      loc_code: req.query.loc_code || req.user?.loc_code,
      company_code: req.headers['x-company-code'] || req.tenant_id || req.user?.company_code,
      count: req.query.count,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error generating docket numbers');
  }
});

router.post('/', async (req, res) => {
  try {
    const user = req.user || {};
    const data = await DocketPreAlloc.save({
      ...req.body,
      loc_code: req.body.loc_code || user.loc_code,
      company_code: req.body.company_code || req.tenant_id || user.company_code,
      aud_user: user.userName || user.userId,
    });
    res.status(200).json({ success: true, message: 'Dockets pre-allocated', data });
  } catch (error) {
    sendError(res, error, 'Error saving pre-allocation');
  }
});

module.exports = router;
