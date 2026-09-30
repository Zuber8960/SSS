const express = require('express');
const router = express.Router();
const ItemMaster = require('./itemMaster.controller');

router.get('/', async (req, res) => {
  try {
    const data = await ItemMaster.getAll({
      item_group_code: req.query.item_group_code,
      search: req.query.search,
      searchBy: req.query.searchBy,
    });
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Item Master error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error retrieving items' });
  }
});

router.get('/next-code', async (req, res) => {
  try {
    const item_code = await ItemMaster.getNextCode();
    res.status(200).json({ success: true, data: { item_code } });
  } catch (error) {
    console.error('Item Master next-code error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error generating item code' });
  }
});

router.post('/', async (req, res) => {
  try {
    const recId = req.user.recId;
    const desc = String(req.body.item_desc || '').trim();
    if (!desc) {
      return res.status(400).json({ success: false, message: 'Item Desc is required' });
    }
    if (!String(req.body.item_group_code || '').trim()) {
      return res.status(400).json({ success: false, message: 'Item Group Code is required' });
    }
    if (!String(req.body.sac_hsn_flag || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please select Goods (HSN) or Services (SAC)' });
    }
    const payload = { ...req.body };
    if (!payload.item_code) {
      payload.item_code = await ItemMaster.getNextCode();
    }
    const company_code = req.headers['x-company-code'] || payload.company_code;
    const division_code = req.divisionId;
    const data = await ItemMaster.save(recId, payload, company_code, division_code);
    res.status(201).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Item Master save error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error saving item' });
  }
});

router.put('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const desc = String(req.body.item_desc || '').trim();
    if (!desc) {
      return res.status(400).json({ success: false, message: 'Item Desc is required' });
    }
    if (!String(req.body.item_group_code || '').trim()) {
      return res.status(400).json({ success: false, message: 'Item Group Code is required' });
    }
    if (!String(req.body.sac_hsn_flag || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please select Goods (HSN) or Services (SAC)' });
    }
    const data = await ItemMaster.update(recId, {
      ...req.body,
      aud_user: req.user.userName,
    });
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Item Master update error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error updating item' });
  }
});

router.delete('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const deletedCount = await ItemMaster.remove(recId);
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Item Master delete error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error deleting item' });
  }
});

module.exports = router;
