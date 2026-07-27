const express = require('express');
const router = express.Router();
const CNSController = require('./cns.controller');

/* ================= LOCAL PICKUP VALIDATION ================= */

router.get('/validate/local-pickup', async (req, res) => {
  try {
    const { docketNo, fromLoc, fromTown } = req.query;
    if (!docketNo || !fromLoc || !fromTown) {
      return res.status(400).json({
        success: false,
        message: 'docketNo, fromLoc, and fromTown are required',
      });
    }
    const result = await CNSController.validateLocalPickup({ docketNo, fromLoc, fromTown });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LONG HAUL VALIDATION ================= */

router.get('/validate/long-haul', async (req, res) => {
  try {
    const { docketNo, fromLoc, fromTown } = req.query;
    if (!docketNo || !fromLoc || !fromTown) {
      return res.status(400).json({
        success: false,
        message: 'docketNo, fromLoc, and fromTown are required',
      });
    }
    const result = await CNSController.validateLongHaul({ docketNo, fromLoc, fromTown });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ================= LOCAL DELIVERY VALIDATION ================= */

router.get('/validate/local-delivery', async (req, res) => {
  try {
    const { docketNo, fromLoc, toLoc, toTown } = req.query;
    if (!docketNo || !fromLoc || !toLoc || !toTown) {
      return res.status(400).json({
        success: false,
        message: 'docketNo, fromLoc, toLoc, and toTown are required',
      });
    }
    const result = await CNSController.validateLocalDelivery({ docketNo, fromLoc, toLoc, toTown });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;