const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const DeliveryNoteController = require('./deliveryNote.controller');

// ── POD file upload (stored under backend/uploads/pod, served at /uploads/pod/...) ──
const POD_DIR = path.join(__dirname, '..', '..', 'uploads', 'pod');
fs.mkdirSync(POD_DIR, { recursive: true });

const podStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, POD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `pod_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const podUpload = multer({
  storage: podStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'application/pdf'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`File type not supported: ${file.mimetype}`));
  },
});

// Upload POD file → returns { url: "/uploads/pod/<filename>" }
router.post('/pod', podUpload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No POD file received' });
  }
  res.status(201).json({ success: true, data: { url: `/uploads/pod/${req.file.filename}` } });
});

router.get('/', async (req, res) => {
  try {
    const filters = {
      company_code: req.query.company_code || req.headers['x-company-code'] || null,
      division_code: req.query.division_code || null,
      dly_note_no: req.query.dly_note_no || null,
      docket_no: req.query.docket_no || null,
    };

    const data = await DeliveryNoteController.getAllDeliveryNotes(filters);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/docket/:docketNo', async (req, res) => {
  try {
    const { docketNo } = req.params;
    const company_code = req.headers['x-company-code'] || null;
    const data = await DeliveryNoteController.getDeliveryNoteByDocketNo(docketNo, company_code);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Delivery note not found for this docket' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:dlyNoteNo', async (req, res) => {
  try {
    const { dlyNoteNo } = req.params;
    const company_code = req.headers['x-company-code'] || null;
    const data = await DeliveryNoteController.getDeliveryNoteByDlyNoteNo(dlyNoteNo, company_code);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Delivery note not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    const data = await DeliveryNoteController.saveDeliveryNote(payload);
    res.status(201).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:dlyNoteNo', async (req, res) => {
  try {
    const { dlyNoteNo } = req.params;
    const company_code = req.headers['x-company-code'] || null;
    const data = await DeliveryNoteController.updateDeliveryNote(dlyNoteNo, req.body, company_code);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Delivery note not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:dlyNoteNo', async (req, res) => {
  try {
    const { dlyNoteNo } = req.params;
    const company_code = req.headers['x-company-code'] || null;
    const deletedCount = await DeliveryNoteController.deleteDeliveryNote(dlyNoteNo, company_code);
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Delivery note not found' });
    }
    res.status(200).json({ success: true, message: 'Delivery note deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
