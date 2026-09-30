const express = require('express');
const router = express.Router();
const ItemGroupMaster = require('./itemGroupMaster.controller');

router.get('/', async (req, res) => {
  try {
    const data = await ItemGroupMaster.getAll();
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Item Group Master error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error retrieving item groups' });
  }
});

router.get('/next-code', async (req, res) => {
  try {
    const item_group_code = await ItemGroupMaster.getNextCode();
    res.status(200).json({ success: true, data: { item_group_code } });
  } catch (error) {
    console.error('Item Group Master next-code error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generating item group code' });
  }
});

router.post('/', async (req, res) => {
  try {
    const recId = req.user.recId;
    const desc = String(req.body.item_group_desc || '').trim();
    if (!desc) {
      return res.status(400).json({ success: false, message: 'Item Group Desc is required' });
    }
    const payload = { ...req.body };
    if (!payload.item_group_code) {
      payload.item_group_code = await ItemGroupMaster.getNextCode();
    }
    const company_code = req.headers['x-company-code'] || payload.company_code;
    const division_code = req.divisionId;
    const data = await ItemGroupMaster.save(recId, payload, company_code, division_code);
    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Item Group Master save error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error saving item group' });
  }
});

router.put('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const desc = String(req.body.item_group_desc || '').trim();
    if (!desc) {
      return res.status(400).json({ success: false, message: 'Item Group Desc is required' });
    }
    const data = await ItemGroupMaster.update(recId, {
      ...req.body,
      aud_user: req.user.userName,
    });
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Item group not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Item Group Master update error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error updating item group' });
  }
});

router.delete('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const deletedCount = await ItemGroupMaster.remove(recId);
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Item group not found' });
    }
    res.status(200).json({ success: true, message: 'Item group deleted successfully' });
  } catch (error) {
    console.error('Item Group Master delete error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting item group' });
  }
});

module.exports = router;
