const express = require('express');
const router = express.Router();
const ctrl = require('./materialGroup.controller');

router.get('/', async (req, res) => {
  try {
    const data = await ctrl.getAllGroups(req.tenant_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/subgroups', async (req, res) => {
  try {
    const data = await ctrl.getSubGroups(null, req.tenant_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/:groupCode/subgroups', async (req, res) => {
  try {
    const data = await ctrl.getSubGroups(req.params.groupCode, req.tenant_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
