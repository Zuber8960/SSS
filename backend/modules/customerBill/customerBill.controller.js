const db = require('../../config/db');

/* ================= HELPERS ================= */

const normalizeDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const normalizeNumber = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
};

const sanitizeHeader = (payload = {}) => ({
  division_code: payload.division_code ?? null,
  loc_code: payload.loc_code ?? null,
  bp_code: normalizeNumber(payload.bp_code),
  bp_name: payload.bp_name ?? null,
  invoice_type: payload.invoice_type ?? 'C',
  invoice_no: normalizeNumber(payload.invoice_no),
  invoice_date: normalizeDate(payload.invoice_date),
  write_off_flag: payload.write_off_flag ?? null,
  write_off_date: normalizeDate(payload.write_off_date),
  loc_gstin: payload.loc_gstin ?? null,
  bp_gstin: payload.bp_gstin ?? null,
  sac_code: payload.sac_code ?? null,
  irn_status: payload.irn_status ?? null,
  irn_ackno: payload.irn_ackno ?? null,
  irn_ackdt: normalizeDate(payload.irn_ackdt),
  irn_no: payload.irn_no ?? null,
  irn_qrcode: payload.irn_qrcode ?? null,
  inv_sub_date: normalizeDate(payload.inv_sub_date),
  cancel_flag: payload.cancel_flag ?? null,
  total_inv_amt: normalizeNumber(payload.total_inv_amt),
  created_by: payload.created_by ?? null,
  created_on: payload.created_on ?? new Date(),
  modified_by: payload.modified_by ?? null,
  modified_on: payload.modified_on ?? null,
});

const sanitizeDetail = (payload = {}) => ({
  company_code: payload.company_code ?? null,
  division_code: payload.division_code ?? null,
  invoice_loc: payload.invoice_loc ?? payload.loc_code ?? null,
  invoice_no: normalizeNumber(payload.invoice_no),
  invoice_date: normalizeDate(payload.invoice_date),
  inv_sr_no: normalizeNumber(payload.inv_sr_no),
  docket_no: payload.docket_no ?? null,
  docket_from_loc: payload.docket_from_loc ?? payload.origin ?? null,
  docket_to_loc: payload.docket_to_loc ?? payload.destination ?? null,
  docket_date: normalizeDate(payload.docket_date),
  docket_chrwt: normalizeNumber(payload.docket_chrwt ?? payload.charge_wt),
  ref_inv_no: payload.ref_inv_no ?? null,
  ref_inv_date: normalizeDate(payload.ref_inv_date),
  ref_inv_loc: payload.ref_inv_loc ?? null,
  freight: normalizeNumber(payload.freight),
  demmurage: normalizeNumber(payload.demmurage),
  loading: normalizeNumber(payload.loading),
  unloading: normalizeNumber(payload.unloading),
  detention: normalizeNumber(payload.detention),
  green_tax: normalizeNumber(payload.green_tax),
  additional_toll: normalizeNumber(payload.additional_toll ?? payload.add_toll),
  other_charges: normalizeNumber(payload.other_charges),
  taxable_amt: normalizeNumber(payload.taxable_amt ?? payload.taxable),
  sgst: normalizeNumber(payload.sgst),
  cgst: normalizeNumber(payload.cgst),
  igst: normalizeNumber(payload.igst),
  total_amt: normalizeNumber(payload.total_amt ?? payload.amount),
  delivery_status: payload.delivery_status ?? null,
  delivery_date: normalizeDate(payload.delivery_date),
  pod_flag: payload.pod_flag ?? payload.pod ?? null,
  created_by: payload.created_by ?? null,
  created_on: payload.created_on ?? new Date(),
  modified_by: payload.modified_by ?? null,
  modified_on: payload.modified_on ?? null,
});

/* ================= GET ================= */

async function getAllInvoices(filters = {}) {
  const query = db('sss.sst_invoice_hdr').select('*');

  if (filters.company_code) query.where({ company_code: filters.company_code });
  if (filters.division_code) query.andWhere({ division_code: filters.division_code });
  if (filters.loc_code) query.andWhere({ loc_code: filters.loc_code });
  if (filters.invoice_no) query.andWhere({ invoice_no: filters.invoice_no });
  if (filters.bp_code) query.andWhere({ bp_code: filters.bp_code });
  if (filters.from_date) query.andWhere('invoice_date', '>=', filters.from_date);
  if (filters.to_date) query.andWhere('invoice_date', '<=', filters.to_date);

  return query.orderBy('invoice_date', 'desc').orderBy('invoice_no', 'desc');
}

async function getInvoiceDetail(invoiceNo, invoiceDate, invoiceLoc) {
  const query = db('sss.sst_invoice_dtl')
    .where({ invoice_no: invoiceNo, invoice_date: invoiceDate, invoice_loc: invoiceLoc })
    .orderBy('inv_sr_no', 'asc');
  return query;
}

async function getFullInvoice(invoiceNo, invoiceDate, invoiceLoc, company_code) {
  const headerQuery = db('sss.sst_invoice_hdr')
    .where({ invoice_no: invoiceNo, invoice_date: invoiceDate, loc_code: invoiceLoc });
  if (company_code) headerQuery.andWhere({ company_code });

  const header = await headerQuery.first();
  if (!header) return null;

  const details = await getInvoiceDetail(invoiceNo, invoiceDate, invoiceLoc);
  return { ...header, details };
}

/* ================= SAVE (header + details) ================= */

async function saveInvoice(payload = {}) {
  const { header = {}, details = [] } = payload;

  const keys = {
    division_code: header.division_code,
    invoice_no: header.invoice_no,
    loc_code: header.loc_code,
    invoice_date: header.invoice_date,
  };

  const trx = await db.transaction();

  try {
    const existing = await trx('sss.sst_invoice_hdr')
      .where(keys)
      .first();

    let savedHeader;
    if (existing) {
      // Update existing header
      const updates = sanitizeHeader({ ...header, modified_on: new Date() });
      delete updates.record_id;
      delete updates.created_on;
      delete updates.created_by;

      [savedHeader] = await trx('sss.sst_invoice_hdr')
        .where(keys)
        .update(updates)
        .returning('*');
    } else {
      // Insert new header
      [savedHeader] = await trx('sss.sst_invoice_hdr')
        .insert(sanitizeHeader(header))
        .returning('*');
    }

    // Delete old details and re-insert
    const detailKeys = {
      invoice_no: header.invoice_no,
      invoice_date: header.invoice_date,
      invoice_loc: header.loc_code,
    };
    await trx('sss.sst_invoice_dtl').where(detailKeys).del();

    // Insert details
    if (Array.isArray(details) && details.length > 0) {
      const detailRows = details.map((d, index) =>
        sanitizeDetail({
          ...d,
          ...detailKeys,
          inv_sr_no: d.inv_sr_no || index + 1,
        })
      );
      await trx('sss.sst_invoice_dtl').insert(detailRows);
    }

    await trx.commit();
    return { header: savedHeader, details: details.length };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

/* ================= UPDATE / DELETE ================= */

async function updateInvoice(invoiceNo, invoiceDate, invoiceLoc, payload = {}) {
  const { header = {}, details = [] } = payload;
  const keys = { invoice_no: invoiceNo, invoice_date: invoiceDate, loc_code: invoiceLoc };

  const trx = await db.transaction();

  try {
    const existing = await trx('sss.sst_invoice_hdr').where(keys).first();
    if (!existing) {
      await trx.rollback();
      return null;
    }

    const updates = sanitizeHeader({ ...header, ...keys, modified_on: new Date() });
    delete updates.record_id;
    delete updates.created_on;
    delete updates.created_by;

    const [updatedHeader] = await trx('sss.sst_invoice_hdr')
      .where(keys)
      .update(updates)
      .returning('*');

    // Delete old details and re-insert
    const detailKeys = { invoice_no: invoiceNo, invoice_date: invoiceDate, invoice_loc: invoiceLoc };
    await trx('sss.sst_invoice_dtl').where(detailKeys).del();

    if (Array.isArray(details) && details.length > 0) {
      const detailRows = details.map((d, index) =>
        sanitizeDetail({
          ...d,
          ...detailKeys,
          inv_sr_no: d.inv_sr_no || index + 1,
        })
      );
      await trx('sss.sst_invoice_dtl').insert(detailRows);
    }

    await trx.commit();
    return { header: updatedHeader, details: details.length };
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

async function deleteInvoice(invoiceNo, invoiceDate, invoiceLoc) {
  const keys = { invoice_no: invoiceNo, invoice_date: invoiceDate, loc_code: invoiceLoc };
  const trx = await db.transaction();

  try {
    await trx('sss.sst_invoice_dtl')
      .where({ invoice_no: invoiceNo, invoice_date: invoiceDate, invoice_loc: invoiceLoc })
      .del();
    const deleted = await trx('sss.sst_invoice_hdr').where(keys).del();
    await trx.commit();
    return deleted;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

module.exports = {
  getAllInvoices,
  getInvoiceDetail,
  getFullInvoice,
  saveInvoice,
  updateInvoice,
  deleteInvoice,
};