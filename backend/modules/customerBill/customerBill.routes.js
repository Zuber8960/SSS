const express = require('express');
const router = express.Router();
const CustomerBillController = require('./customerBill.controller');

/* ================= GET ALL INVOICES ================= */

router.get('/', async (req, res) => {
  try {
    const filters = {
      company_code: req.headers['x-company-code'] || null,
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
    const company_code = req.headers['x-company-code'] || null;
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
    const data = await CustomerBillController.getInvoiceDetail(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= SAVE INVOICE (header + details) ================= */

router.post('/', async (req, res) => {
  try {
    const data = await CustomerBillController.saveInvoice(req.body);
    res.status(201).json({ success: true, message: 'Invoice saved successfully', data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= UPDATE INVOICE ================= */

router.put('/:invoiceNo/:invoiceDate/:invoiceLoc', async (req, res) => {
  try {
    const { invoiceNo, invoiceDate, invoiceLoc } = req.params;
    const data = await CustomerBillController.updateInvoice(
      Number(invoiceNo),
      invoiceDate,
      invoiceLoc,
      req.body
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