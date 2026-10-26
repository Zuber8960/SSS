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
  company_code: payload.company_code ?? null,
  tenant_id: payload.tenant_id ?? null,
  division_code: payload.division_code ?? null,
  loc_code: payload.loc_code ?? null,
  bp_code: normalizeNumber(payload.bp_code),
  bp_name: payload.bp_name ?? null,
  invoice_type: payload.invoice_type ?? 'R',
  invoice_no: normalizeNumber(payload.invoice_no),
  invoice_date: normalizeDate(payload.invoice_date),
  write_off_flag: payload.write_off_flag ?? null,
  write_off_date: normalizeDate(payload.write_off_date),
  loc_gstin: payload.loc_gstin ?? null,
  bp_gstin: payload.bp_gstin ?? null,
  sac_code: String(payload.sac_code || '').split(' - ')[0].trim() || null,
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

const isSubmitted = (header) => {
  const v = header?.inv_sub_date;
  return v !== undefined && v !== null && String(v).trim() !== '';
};

const findInvoiceHeader = (qb, invoiceNo, invoiceDate, invoiceLoc, company_code = null) => {
  const query = qb('sss.sst_invoice_hdr')
    .where({ loc_code: invoiceLoc })
    .andWhereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
    .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate]);
  if (company_code) {
    query.andWhere((q) =>
      q.where({ company_code }).orWhereNull('company_code').orWhereNull('tenant_id')
    );
  }
  return query.first();
};

const sanitizeDetail = (payload = {}) => {
  const handling = normalizeNumber(payload.handling ?? payload.loading);
  const fuelSurcharge = normalizeNumber(payload.fuel_surcharge ?? payload.unloading);
  const factoryCharge = normalizeNumber(payload.factory_charge ?? payload.detention);
  const odaCharge = normalizeNumber(payload.oda_charge ?? payload.additional_toll ?? payload.add_toll);
  const fov = normalizeNumber(payload.fov ?? payload.green_tax);
  const stationery = normalizeNumber(payload.stationery ?? payload.other_charges);
  return {
    company_code: payload.company_code ?? null,
    division_code: payload.division_code ?? null,
    invoice_loc: payload.invoice_loc ?? payload.loc_code ?? null,
    invoice_no: normalizeNumber(payload.invoice_no),
    invoice_date: normalizeDate(payload.invoice_date),
    invoice_type: payload.invoice_type ?? payload.billing_type ?? null,
    inv_sr_no: normalizeNumber(payload.inv_sr_no),
    docket_no: payload.docket_no ?? null,
    docket_from_loc: payload.docket_from_loc ?? payload.origin ?? null,
    docket_to_loc: payload.docket_to_loc ?? payload.destination ?? null,
    docket_from_town: payload.docket_from_town ?? payload.from_town ?? null,
    docket_to_town: payload.docket_to_town ?? payload.to_town ?? null,
    docket_date: normalizeDate(payload.docket_date),
    docket_chrwt: normalizeNumber(payload.docket_chrwt ?? payload.charge_wt),
    docket_actwt: normalizeNumber(payload.docket_actwt ?? payload.actual_wt),
    consignee: payload.consignee ?? payload.cnee_name ?? null,
    ref_inv_no: payload.ref_inv_no ?? null,
    ref_inv_date: normalizeDate(payload.ref_inv_date),
    ref_inv_loc: payload.ref_inv_loc ?? null,
    freight: normalizeNumber(payload.freight),
    handling,
    fuel_surcharge: fuelSurcharge,
    factory_charge: factoryCharge,
    oda_charge: odaCharge,
    fov,
    stationery,
    taxable_amt: normalizeNumber(payload.taxable_amt ?? payload.taxable),
    cgst: normalizeNumber(payload.cgst),
    sgst: normalizeNumber(payload.sgst),
    igst: normalizeNumber(payload.igst),
    total_amt: normalizeNumber(payload.total_amt ?? payload.amount),
    delivery_status: payload.delivery_status ?? null,
    delivery_date: normalizeDate(payload.delivery_date),
    pod_flag: payload.pod_flag ?? payload.pod ?? null,
    created_by: payload.created_by ?? null,
    created_on: payload.created_on ?? new Date(),
    modified_by: payload.modified_by ?? null,
    modified_on: payload.modified_on ?? null,
  };
};

/* ================= GENERATE NEXT INVOICE NO ================= */

async function getNextInvoiceNo(loc_code, trx = db) {
  const loc = String(loc_code || "").trim();
  if (!loc) {
    throw new Error("Billing branch is required to generate bill number");
  }
  const result = await trx.raw(
    `SELECT COALESCE(MAX(CAST(invoice_no AS INTEGER)), 0) + 1 AS next_no
     FROM sss.sst_invoice_hdr
     WHERE UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))`,
    [loc]
  );
  return result.rows?.[0]?.next_no || 1;
}

/* ================= GET ================= */

async function getAllInvoices(filters = {}) {
  const query = db('sss.sst_invoice_hdr').select('*');

  // Tenant scoping: legacy rows were saved with company_code/tenant_id NULL
  // (sanitizeHeader used to drop them), so NULL rows must stay visible or the
  // report comes back empty for older invoices.
  if (filters.company_code) {
    query.where((q) =>
      q.where({ company_code: filters.company_code })
        .orWhere({ tenant_id: filters.company_code })
        .orWhereNull('company_code')
        .orWhereNull('tenant_id')
    );
  }
  if (filters.division_code) query.andWhere({ division_code: filters.division_code });
  if (filters.loc_code) query.andWhere({ loc_code: filters.loc_code });
  if (filters.invoice_no) query.andWhere({ invoice_no: filters.invoice_no });
  if (filters.bp_code) query.andWhere({ bp_code: filters.bp_code });
  if (filters.from_date) query.andWhere('invoice_date', '>=', filters.from_date);
  if (filters.to_date) query.andWhere('invoice_date', '<=', filters.to_date);

  return query
    .orderByRaw('CAST(invoice_no AS INTEGER) ASC')
    .orderBy('invoice_date', 'desc');
}

async function getBilledDocketNos(company_code = null) {
  const query = db('sss.sst_invoice_dtl')
    .distinct('docket_no')
    .whereNotNull('docket_no')
    .whereRaw("TRIM(docket_no::text) <> ''");
  if (company_code) {
    query.andWhere((q) => q.where({ company_code }).orWhereNull('company_code'));
  }
  const rows = await query;
  return (rows || []).map((r) => String(r.docket_no).trim()).filter(Boolean);
}

async function getInvoiceDetail(invoiceNo, invoiceDate, invoiceLoc, company_code = null) {
  const query = db('sss.sst_invoice_dtl')
    .where({ invoice_loc: invoiceLoc })
    .andWhereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
    .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate]);
  if (company_code) query.andWhere((q) => q.where({ company_code }).orWhereNull('company_code'));
  return query.orderBy('inv_sr_no', 'asc');
}

async function getInvoiceByNumber(invoiceNo, loc_code = null, company_code = null) {
  const no = parseInt(String(invoiceNo ?? '').trim(), 10);
  if (!Number.isFinite(no)) return null;

  const query = db('sss.sst_invoice_hdr').whereRaw('CAST(invoice_no AS INTEGER) = ?', [no]);
  if (loc_code) query.andWhere({ loc_code });
  if (company_code) {
    query.andWhere((q) =>
      q.where({ company_code })
        .orWhere({ tenant_id: company_code })
        .orWhereNull('company_code')
        .orWhereNull('tenant_id')
    );
  }

  const header = await query.orderBy('invoice_date', 'desc').first();
  if (!header) return null;

  const details = await getInvoiceDetail(
    header.invoice_no,
    header.invoice_date,
    header.loc_code,
    company_code
  );
  return { ...header, details };
}

async function getFullInvoice(invoiceNo, invoiceDate, invoiceLoc, company_code = null) {
  const headerQuery = db('sss.sst_invoice_hdr')
    .where({ loc_code: invoiceLoc })
    .andWhereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
    .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate]);
  if (company_code) {
    headerQuery.andWhere((q) =>
      q.where({ company_code }).orWhereNull('company_code').orWhereNull('tenant_id')
    );
  }

  const header = await headerQuery.first();
  if (!header) return null;

  const details = await getInvoiceDetail(invoiceNo, invoiceDate, invoiceLoc, company_code);
  return { ...header, details };
}

/* ================= SAVE (header + details) ================= */

async function saveInvoice(payload = {}, company_code = null) {
  const { header = {}, details = [] } = payload;

  let headerWithNo = { ...header };

  const trx = await db.transaction();

  try {
    // Next number is per loc_code, so GGRN/1 and LLDH/1 can both exist.
    if (!header.invoice_no) {
      headerWithNo.invoice_no = await getNextInvoiceNo(headerWithNo.loc_code, trx);
    }

    const existing = await findInvoiceHeader(
      trx,
      headerWithNo.invoice_no,
      headerWithNo.invoice_date,
      headerWithNo.loc_code,
      company_code
    );

    let savedHeader;
    if (existing) {
      if (isSubmitted(existing)) {
        await trx.rollback();
        throw new Error('Submitted bills cannot be edited');
      }
      // Update existing header
      const updates = sanitizeHeader({ ...headerWithNo, modified_on: new Date() });
      delete updates.record_id;
      delete updates.created_on;
      delete updates.created_by;
      delete updates.inv_sub_date;

      [savedHeader] = await trx('sss.sst_invoice_hdr')
        .where({ record_id: existing.record_id })
        .update(updates)
        .returning('*');
    } else {
      // Insert new header with auto-generated invoice_no
      headerWithNo.company_code = company_code;
      headerWithNo.tenant_id = company_code;
      [savedHeader] = await trx('sss.sst_invoice_hdr')
        .insert(sanitizeHeader(headerWithNo))
        .returning('*');
    }

    // Delete old details and re-insert
    const detailKeys = {
      invoice_no: savedHeader.invoice_no,
      invoice_date: savedHeader.invoice_date,
      invoice_loc: savedHeader.loc_code,
      company_code: company_code,
    };
    await trx('sss.sst_invoice_dtl').where(detailKeys).del();

    // Insert details
    if (Array.isArray(details) && details.length > 0) {
      if (company_code) details.forEach(d => d.company_code = company_code);
      const invoiceType = savedHeader.invoice_type ?? headerWithNo.invoice_type ?? 'R';
      const detailRows = details.map((d, index) =>
        sanitizeDetail({
          ...d,
          ...detailKeys,
          invoice_type: invoiceType,
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

async function updateInvoice(invoiceNo, invoiceDate, invoiceLoc, payload = {}, company_code = null) {
  const { header = {}, details = [] } = payload;
  const match = { invoice_no: invoiceNo, invoice_date: invoiceDate, loc_code: invoiceLoc };

  const trx = await db.transaction();

  try {
    const existing = await findInvoiceHeader(trx, invoiceNo, invoiceDate, invoiceLoc, company_code);
    if (!existing) {
      await trx.rollback();
      return null;
    }
    if (isSubmitted(existing)) {
      await trx.rollback();
      throw new Error('Submitted bills cannot be edited');
    }

    const updates = sanitizeHeader({ ...header, ...match, modified_on: new Date() });
    delete updates.record_id;
    delete updates.created_on;
    delete updates.created_by;
    delete updates.inv_sub_date;

    const [updatedHeader] = await trx('sss.sst_invoice_hdr')
      .where({ record_id: existing.record_id })
      .update(updates)
      .returning('*');

    // Delete old details and re-insert
    const detailKeys = { invoice_no: invoiceNo, invoice_date: invoiceDate, invoice_loc: invoiceLoc };
    await trx('sss.sst_invoice_dtl').where(detailKeys).del();

    if (Array.isArray(details) && details.length > 0) {
      const invoiceType = updatedHeader.invoice_type ?? header.invoice_type ?? existing.invoice_type ?? 'R';
      const detailRows = details.map((d, index) =>
        sanitizeDetail({
          ...d,
          ...detailKeys,
          invoice_type: invoiceType,
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

async function deleteInvoice(invoiceNo, invoiceDate, invoiceLoc, company_code = null) {
  const trx = await db.transaction();

  try {
    const existing = await findInvoiceHeader(trx, invoiceNo, invoiceDate, invoiceLoc, company_code);
    if (!existing) {
      await trx.rollback();
      return 0;
    }
    if (isSubmitted(existing)) {
      await trx.rollback();
      throw new Error('Submitted bills cannot be deleted');
    }
    await trx('sss.sst_invoice_dtl')
      .where({ invoice_no: invoiceNo, invoice_date: invoiceDate, invoice_loc: invoiceLoc })
      .del();
    const deleted = await trx('sss.sst_invoice_hdr').where({ record_id: existing.record_id }).del();
    await trx.commit();
    return deleted;
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

module.exports = {
  getAllInvoices,
  getBilledDocketNos,
  getInvoiceByNumber,
  getInvoiceDetail,
  getFullInvoice,
  saveInvoice,
  updateInvoice,
  deleteInvoice,
};