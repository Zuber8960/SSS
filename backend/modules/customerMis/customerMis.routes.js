const express = require('express');
const router = express.Router();
const CustomerMisController = require('./customerMis.controller');

/** Pull the shared MIS filters off the query string. */
const readFilters = (req) => ({
  from_date: req.query.from_date || null,
  to_date: req.query.to_date || null,
  bp_id: req.query.bp_id || null,
  search: req.query.search || null,
  delivery_status: req.query.delivery_status || null,
  limit: req.query.limit ? Number(req.query.limit) : undefined,
});

/* ================= GET CUSTOMER MIS LIST ================= */

router.get('/', async (req, res) => {
  try {
    const data = await CustomerMisController.getCustomerMisList(readFilters(req), req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Customer MIS error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= GET SUMMARY TOTALS (same filters) ================= */

router.get('/summary', async (req, res) => {
  try {
    const data = await CustomerMisController.getCustomerMisSummary(readFilters(req), req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Customer MIS summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= CUSTOMER DROPDOWN (distinct customers) ================= */

router.get('/customers', async (req, res) => {
  try {
    const data = await CustomerMisController.getCustomerMisCustomers(
      { search: req.query.search || null },
      req.tenant_id
    );
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Customer MIS customers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ================= DATE RANGE (bounds for the From/To pickers) ================= */

router.get('/date-range', async (req, res) => {
  try {
    const data = await CustomerMisController.getCustomerMisDateRange(req.tenant_id);
    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Customer MIS date range error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;