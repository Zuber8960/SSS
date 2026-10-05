const express = require('express');
const router = express.Router();
const JobApproval = require('./jobApproval.controller');

function sendError(res, error, fallback) {
  const status = error.status || 500;
  if (status >= 500) console.error('Job Approval error:', error);
  res.status(status).json({ success: false, message: error.message || fallback });
}

router.get('/branches', async (req, res) => {
  try {
    const data = await JobApproval.listBranches();
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading branches');
  }
});

router.get('/jobs', async (req, res) => {
  try {
    const data = await JobApproval.listJobs(req.query.branch || req.query.job_branch);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading jobs');
  }
});

router.get('/job', async (req, res) => {
  try {
    const data = await JobApproval.getJob({
      disp: req.query.disp,
      job_code: req.query.job_code,
      job_branch: req.query.job_branch || req.query.branch,
      job_date: req.query.job_date,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading job');
  }
});

router.get('/vehicle-cost', async (req, res) => {
  try {
    const data = await JobApproval.vehicleCost(req.query.lorry_no);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading vehicle cost');
  }
});

router.get('/history', async (req, res) => {
  try {
    const data = await JobApproval.listHistory(req.query.lorry_no);
    res.status(200).json({ success: true, data });
  } catch (error) {
    sendError(res, error, 'Error loading history');
  }
});

router.post('/', async (req, res) => {
  try {
    const user = req.user || {};
    const data = await JobApproval.save({
      ...req.body,
      aud_user: user.userName || user.userId,
    });
    res.status(200).json({ success: true, message: 'Record Saved', data });
  } catch (error) {
    sendError(res, error, 'Error saving job approval');
  }
});

module.exports = router;
