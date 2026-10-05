const express = require('express');
const router = express.Router();
const BillSubmission = require('./billSubmission.controller');

router.get('/pending', async (req, res) => {
  try {
    const data = await BillSubmission.listPendingBills({
      loc_code: req.query.loc_code,
      bp_code: req.query.bp_code,
      submit_type: req.query.submit_type,
      annexure_no: req.query.annexure_no,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Bill Submission pending error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading bills' });
  }
});

router.get('/annexures', async (req, res) => {
  try {
    const data = await BillSubmission.listAnnexures({
      loc_code: req.query.loc_code,
      bp_code: req.query.bp_code,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Bill Submission annexure error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading annexures' });
  }
});

router.post('/', async (req, res) => {
  try {
    const data = await BillSubmission.saveSubmission({
      ...req.body,
      aud_user: req.user?.userName || req.user?.userId,
    });
    res.status(200).json({ success: true, message: 'Record saved', data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Bill Submission save error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error saving bill submission' });
  }
});

module.exports = router;
