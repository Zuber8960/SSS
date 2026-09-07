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
    // Mobile camera captures often have no extension — derive it from the mimetype.
    let ext = path.extname(file.originalname || "");
    if (!ext) {
      const mimeExtMap = {
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/png": ".png",
        "image/gif": ".gif",
        "image/heic": ".heic",
        "image/heif": ".heif",
        "application/pdf": ".pdf",
      };
      ext = mimeExtMap[file.mimetype] || ".jpg";
    }
    cb(null, `pod_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

// Camera captures on mobile can report an empty mimetype or image/heic (iPhone).
// Accept those and fall back to the file extension.
const ALLOWED_EXT = /\.(jpe?g|png|gif|heic|heif|pdf)$/i;
const podUpload = multer({
  storage: podStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/jpg", "image/gif",
      "image/heic", "image/heif", "application/pdf",
      "", // Android Chrome camera capture often sends an empty mimetype
    ];
    if (allowed.includes(file.mimetype) && ALLOWED_EXT.test(file.originalname || "")) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype || "unknown"} (${file.originalname || "unnamed"})`));
    }
  },
});

// Upload POD file → returns { url: "/uploads/pod/<filename>" }
router.post('/pod', (req, res) => {
  podUpload.single('file')(req, res, (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(isSize ? 413 : 400).json({
        success: false,
        message: isSize ? 'File too large (max 5MB)' : err.message,
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No POD file received' });
    }
    res.status(201).json({ success: true, data: { url: `/uploads/pod/${req.file.filename}` } });
  });
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
