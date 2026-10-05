const express = require('express');
const router = express.Router();
const ItemSuppMaster = require('./itemSuppMaster.controller');

router.get('/suppliers', async (req, res) => {
  try {
    const loc_code = req.query.loc_code || req.loc_code;
    const data = await ItemSuppMaster.listSuppliers(loc_code);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Item Supp suppliers error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading suppliers' });
  }
});

router.get('/', async (req, res) => {
  try {
    const item_code = req.query.item_code;
    if (!item_code) {
      return res.status(400).json({ success: false, message: 'item_code is required' });
    }
    const data = await ItemSuppMaster.listByItem(item_code);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Item Supp list error:', error);
    res.status(500).json({ success: false, message: error.message || 'Error loading item suppliers' });
  }
});

router.post('/', async (req, res) => {
  try {
    const item_code = req.body.item_code;
    const rows = req.body.rows || [];
    const loc_code = req.loc_code || req.body.loc_code;
    const data = await ItemSuppMaster.save(item_code, rows, loc_code, req.user?.userName);
    res.status(200).json({ success: true, message: 'Record saved', data });
  } catch (error) {
    const status = error.status || 500;
    console.error('Item Supp save error:', error);
    res.status(status).json({ success: false, message: error.message || 'Error saving item suppliers' });
  }
});

module.exports = router;
