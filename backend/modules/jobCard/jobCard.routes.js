const express = require('express');
const router = express.Router();
const JobCard = require('./jobCard.controller');

router.get('/lorries', async (req, res) => {
  try {
    const data = await JobCard.listLorries(req.query.loc_code || req.user?.loc_code);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Job Card lorries error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading lorries' });
  }
});

router.get('/lorry/:lorryNo', async (req, res) => {
  try {
    const data = await JobCard.lookupLorry({
      lorry_no: req.params.lorryNo,
      loc_code: req.query.loc_code || req.user?.loc_code,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Job Card lorry error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error looking up lorry' });
  }
});

router.get('/next-no', async (req, res) => {
  try {
    const loc_code = req.query.loc_code || req.user?.loc_code;
    const data = await JobCard.nextJobNo(loc_code);
    res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, message: error.message || 'Error generating job no' });
  }
});

router.get('/history', async (req, res) => {
  try {
    const data = await JobCard.listHistory(req.query.lorry_no);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Job Card history error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading history' });
  }
});

router.post('/', async (req, res) => {
  try {
    const user = req.user || {};
    const data = await JobCard.save({
      ...req.body,
      loc_code: req.body.job_branch || req.body.loc_code || user.loc_code,
      aud_user: user.userName || user.userId,
      job_supervisor_code: req.body.job_supervisor_code || user.userId,
      job_supervisor_name: req.body.job_supervisor_name || user.userName,
    });
    res.status(200).json({ success: true, message: 'Job card saved', data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Job Card save error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error saving job card' });
  }
});

module.exports = router;
