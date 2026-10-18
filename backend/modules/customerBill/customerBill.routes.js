const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const CustomerBillController = require('./customerBill.controller');

/* ================= BILL DOCUMENT UPLOAD ================= */

const BILL_DOC_DIR = path.join(__dirname, '..', '..', 'uploads', 'bill-docs');
fs.mkdirSync(BILL_DOC_DIR, { recursive: true });

const billDocStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, BILL_DOC_DIR),
  filename: (req, file, cb) => {
    let ext = path.extname(file.originalname || '');
    if (!ext) {
      const mimeExtMap = {
        'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
        'image/gif': '.gif', 'image/heic': '.heic', 'image/heif': '.heif',
        'application/pdf': '.pdf',
      };
      ext = mimeExtMap[file.mimetype] || '.pdf';
    }
    cb(null, `billdoc_${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});

const BILL_ALLOWED_EXT = /\.(jpe?g|png|gif|heic|heif|pdf)$/i;
const billDocUpload = multer({
  storage: billDocStorage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/png', 'image/jpg', 'image/gif',
      'image/heic', 'image/heif', 'application/pdf', '',
    ];
    if (allowed.includes(file.mimetype) && BILL_ALLOWED_EXT.test(file.originalname || '')) {
      cb(null, true);
    } else {
      cb(new Error(`File type not supported: ${file.mimetype || 'unknown'} (${file.originalname || 'unnamed'})`));
    }
  },
});

// Upload bill document → stores file and saves URL on the invoice header
router.post('/bill-doc', (req, res) => {
  billDocUpload.single('file')(req, res, async (err) => {
    if (err) {
      const isSize = err.code === 'LIMIT_FILE_SIZE';
      return res.status(isSize ? 413 : 400).json({
        success: false,
        message: isSize ? 'File too large (max 20MB)' : err.message,
      });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }
    const url = `/uploads/bill-docs/${req.file.filename}`;
    const { invoice_no, invoice_date, invoice_loc } = req.query;
    if (invoice_no && invoice_date && invoice_loc) {
      try {
        await CustomerBillController.updateBillDocUrl(
          Number(invoice_no), invoice_date, invoice_loc, url
        );
      } catch (e) {
        // Column may not exist yet — return URL without saving to DB
        console.warn('[customerBill] bill_doc_url update failed (column may not exist):', e.message);
      }
    }
    res.status(201).json({ success: true, data: { url } });
  });
});

/* ================= GET ALL INVOICES ================= */

router.get('/', async (req, res) => {
  try {
    const filters = {
      company_code: req.tenant_id || null,
      division_code: req.query.division_code || null,
      loc_code: req.query.loc_code || null,
      invoice_no: req.query.invoice_no || null,
      bp_code: req.query.bp_code || null,
      from_date: req.query.from_date || null,
      to_date: req.query.to_date || null,
    };
    const data = await CustomerBillController.getAllInvoices(filters);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= GET SINGLE INVOICE (header + details) ================= */

router.get('/:invoiceNo/:invoiceDate/:invoiceLoc', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, invoiceLoc } = req.params;
    const company_code = req.tenant_id || null;
    const data = await CustomerBillController.getFullInvoice(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc,
      company_code
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= GET INVOICE DETAILS ONLY ================= */

router.get('/:invoiceNo/:invoiceDate/:invoiceLoc/details', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, invoiceLoc } = req.params;
    const company_code = req.tenant_id || null;
    const data = await CustomerBillController.getInvoiceDetail(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc,
      company_code
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= SAVE INVOICE (header + details) ================= */

router.post('/', async (req, res) => {
  try {
    const { tenant_id } = req;
    const data = await CustomerBillController.saveInvoice(req.body, tenant_id);
    res.status(201).json({ success: true, message: 'Invoice saved successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= UPDATE INVOICE ================= */

router.put('/:invoiceNo/:invoiceDate/:invoiceLoc', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, invoiceLoc } = req.params;
    const { tenant_id } = req;
    const data = await CustomerBillController.updateInvoice(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc,
      req.body,
      tenant_id
    );
    if (!data) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, message: 'Invoice updated successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= DELETE INVOICE ================= */

router.delete('/:invoiceNo/:invoiceDate/:invoiceLoc', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, invoiceLoc } = req.params;
    const deletedCount = await CustomerBillController.deleteInvoice(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc
    );
    if (!deletedCount) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;