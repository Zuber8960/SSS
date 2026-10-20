const db = require('../../config/db');

const calcHireAmt = (rateUom, rate, gtdWt) => {
  const r = Number(rate) || 0;
  const w = Number(gtdWt) || 0;
  const u = Number(rateUom);
  if (u === 2) return Number((r * w).toFixed(2));
  if (u === 3) return Number(((r * w) / 1000).toFixed(2));
  return Number(r.toFixed(2));
};

const isSettled = (row) => String(row?.vha_settled || '').trim().toUpperCase() === 'Y';
const hasSettlementDate = (header) => Boolean(String(header?.vha_final_pay_date || '').trim());

const freezeSettlement = (existing, data) => ({
  ...data,
  vha_dtn_amt: existing.vha_dtn_amt,
  vha_dd_amt: existing.vha_dd_amt,
  vha_final_pay_date: existing.vha_final_pay_date,
  vha_settle_tds_amt: existing.vha_settle_tds_amt,
  vha_gross_payable: existing.vha_gross_payable,
  vha_net_payable: existing.vha_net_payable,
  vha_settled: 'Y',
  vha_settled_on: existing.vha_settled_on,
});

const updateHireVoucherWithSettlement = async (keys, data) => {
  const existing = await getHireVoucherByKey(keys);
  if (!existing) {
    const err = new Error('Hire voucher not found');
    err.status = 404;
    throw err;
  }
  if (isSettled(existing)) {
    return updateHireVoucher(keys, freezeSettlement(existing, data));
  }
  if (hasSettlementDate(data)) {
    return updateHireVoucher(keys, {
      ...data,
      vha_settled: 'Y',
      vha_settled_on: new Date(),
    });
  }
  return updateHireVoucher(keys, {
    ...data,
    vha_settled: 'N',
    vha_settled_on: null,
  });
};

/* ================= GET ALL HIRE VOUCHERS ================= */

const getAllHireVouchers = async () => {
  return db('sss.sst_vha_hdr')
    .select('*')
    .where({ record_status: 0 })
    .orderBy('aud_date', 'desc');
};

/* ================= GET HIRE VOUCHER BY KEY (composite) ================= */

const getHireVoucherByKey = async ({ vha_no, vha_loc, vha_date }) => {
  return db('sss.sst_vha_hdr')
    .where({ vha_no, vha_loc, vha_date, record_status: 0 })
    .first();
};

/* ================= GET HIRE VOUCHER BY NO ONLY (for edit/view) ================= */

const getHireVoucherByNo = async (vha_no) => {
  return db('sss.sst_vha_hdr')
    .where({ vha_no, record_status: 0 })
    .first();
};

/* ================= GET HIRE VOUCHER DETAILS ================= */

// Blank-safe date/number coercion for the NOT NULL columns of sst_vha_dtl.
// mnf_no / mnf_loc are varchar -> '' is fine, but mnf_date is a real DATE
// column, and PostgreSQL rejects '' with:
//   invalid input syntax for type date: ""
// so an empty manifest date must fall back to a valid date value.
const EMPTY_DATE = '1900-01-01';

const toDateOr = (value, fallback = EMPTY_DATE) => {
  if (value === null || value === undefined || String(value).trim() === '') return fallback;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString().slice(0, 10);
};

const toNumOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

// NOTE: the table has no `vhv_srno` column (verified against the live schema),
// so rows are ordered by the surrogate `rec_id` instead.
const getHireVoucherDetails = async ({ vha_no, vha_loc, vha_date }) => {
  return db('sss.sst_vha_dtl')
    .where({ vha_no, vha_loc, vha_date })
    .orderBy('rec_id');
};

/* ================= GENERATE NEXT HIRE VOUCHER NO ================= */

const getNextHireVoucherNo = async (trx = db) => {
  await trx.raw('LOCK TABLE sss.sst_vha_hdr IN SHARE ROW EXCLUSIVE MODE');
  const result = await trx.raw(
    "SELECT COALESCE(MAX(CAST(vha_no AS INTEGER)), 0) + 1 AS next_no FROM sss.sst_vha_hdr WHERE vha_no ~ '^[0-9]+$'"
  );
  const nextNo = result.rows?.[0]?.next_no || 1;
  return String(nextNo);
};

/* ================= CREATE HIRE VOUCHER (header + details in transaction) ================= */

const createHireVoucher = async (headerData, detailsData) => {
  const manifestRows = (detailsData || []).filter((r) => String(r?.mnf_no || '').trim());
  if (!manifestRows.length) {
    const err = new Error('Please select at least one manifest');
    err.status = 400;
    throw err;
  }
  const selectedActWt = manifestRows.reduce((sum, r) => sum + (Number(r.mnf_act_weight) || 0), 0);

  // ── Header: computed amounts (server-side source of truth) ──
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const hireAmt = calcHireAmt(headerData.vha_rate_uom, headerData.vha_rate_per_uom, headerData.vha_guarantee_weight);
  const loadingAmt = n(headerData.vha_loading_amt);
  const dcAmt = n(headerData.vha_dc_amt);
  const grossAmt = hireAmt + loadingAmt + dcAmt;
  const advDiesel = n(headerData.vha_advance_diesel);
  const advCash = n(headerData.vha_advance_cash);
  const advTotal = n(headerData.vha_advance_total) || advDiesel + advCash;
  const tdsAmt = n(headerData.vha_tds_amt);
  const advNet = advTotal + tdsAmt;
  const balAmt = grossAmt - advNet;
  const dtnAmt = n(headerData.vha_dtn_amt);
  const ddAmt = n(headerData.vha_dd_amt);
  const settleTds = n(headerData.vha_settle_tds_amt);
  const grossPayable = balAmt + dtnAmt + ddAmt;
  const netPayable = grossPayable - settleTds;

  const trx = await db.transaction();
  try {
    const nextNo = await getNextHireVoucherNo(trx);
    // Build header row (only known sst_vha_hdr columns are accepted)
    const headerRow = {
      ...headerData,
      vha_no: nextNo,
      // NOT NULL columns — always defaulted
      vha_loc: headerData.vha_loc || '',
      vha_to_loc: headerData.vha_to_loc || '',
      vha_to_loc_state: headerData.vha_to_loc_state || '',
      // numeric columns — cast to numbers (vha_rate_uom is numeric: 1=Fixed, 2=Per Kg, 3=Per Ton, 4=Per Trip)
      dwb_actual_weight: selectedActWt,
      vha_guarantee_weight: headerData.vha_guarantee_weight != null && headerData.vha_guarantee_weight !== "" ? Number(headerData.vha_guarantee_weight) : null,
      vha_rate_uom: headerData.vha_rate_uom != null && headerData.vha_rate_uom !== "" ? Number(headerData.vha_rate_uom) : null,
      vha_rate_per_uom: headerData.vha_rate_per_uom != null && headerData.vha_rate_per_uom !== "" ? Number(headerData.vha_rate_per_uom) : null,
      vha_hire_amt: hireAmt,
      vha_loading_amt: loadingAmt,
      vha_dc_amt: dcAmt,
      vha_total_amt: grossAmt,
      vha_advance_diesel: advDiesel,
      vha_advance_cash: advCash,
      vha_advance_total: advTotal,
      vha_tds_amt: tdsAmt,
      vha_advance_net: advNet,
      vha_balance_amt: balAmt,
      vha_dtn_amt: dtnAmt,
      vha_dd_amt: ddAmt,
      vha_final_pay_date: headerData.vha_final_pay_date || null,
      vha_settle_tds_amt: settleTds,
      vha_gross_payable: grossPayable,
      vha_net_payable: netPayable,
      vha_settled: headerData.vha_final_pay_date ? 'Y' : 'N',
      vha_settled_on: headerData.vha_final_pay_date ? new Date() : null,
      aud_date: new Date(),
    };

    // Insert header
    await trx('sss.sst_vha_hdr').insert(headerRow);

    // Build detail rows with composite key (only sst_vha_dtl columns).
    // mnf_loc / mnf_no (varchar) and mnf_date (date) are NOT NULL, so blanks
    // are coerced to '' / an epoch date rather than null.
    const detailRows = manifestRows.map((row) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || null,
      vha_no: nextNo,
      vha_loc: headerData.vha_loc || '',
      vha_date: headerData.vha_date,
      mnf_no: row.mnf_no || '',
      mnf_date: toDateOr(row.mnf_date),
      mnf_loc: row.mnf_loc || '',
      mnf_act_weight: toNumOrNull(row.mnf_act_weight),
      mnf_cns_no: toNumOrNull(row.mnf_cns_no),
      mnf_pkgs_no: toNumOrNull(row.mnf_pkgs_no),
      aud_user: headerData.aud_user || '',
      aud_loc: headerData.vha_loc || '',
      aud_date: new Date(),
    }));

    // Insert details
    if (detailRows.length > 0) {
      await trx('sss.sst_vha_dtl').insert(detailRows);
    }

    await trx.commit();
    return { ...headerRow, vha_no: nextNo };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= UPDATE HIRE VOUCHER HEADER ================= */

const updateHireVoucher = async (keys, data, trx = db) => {
  return trx('sss.sst_vha_hdr')
    .where(keys)
    .update({
      ...data,
      aud_date: new Date()
    });
};

/* ================= UPDATE HIRE VOUCHER DETAILS (delete all + re-insert) ================= */

const updateHireVoucherDetails = async (keys, detailsData) => {
  const trx = await db.transaction();
  try {
    // Delete existing details
    await trx('sss.sst_vha_dtl')
      .where(keys)
      .del();


    // Insert new details
    // mnf_loc / mnf_no (varchar) and mnf_date (date) are NOT NULL -> coerce blanks.
    // Row order is preserved by inserting in order (rec_id asc).
    const detailRows = detailsData.map((row) => ({
      company_code: row.company_code || null,
      division_code: row.division_code || null,
      vha_no: keys.vha_no,
      vha_loc: keys.vha_loc,
      vha_date: keys.vha_date,
      mnf_no: row.mnf_no || '',
      mnf_date: toDateOr(row.mnf_date),
      mnf_loc: row.mnf_loc || '',
      mnf_act_weight: toNumOrNull(row.mnf_act_weight),
      mnf_cns_no: toNumOrNull(row.mnf_cns_no),
      mnf_pkgs_no: toNumOrNull(row.mnf_pkgs_no),
      aud_user: row.aud_user || '',
      aud_loc: keys.vha_loc,
      aud_date: new Date(),
    }));

    if (detailRows.length > 0) {
      await trx('sss.sst_vha_dtl').insert(detailRows);
    }

    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= DELETE HIRE VOUCHER (soft) ================= */

const deleteHireVoucher = async (keys, trx = db) => {
  return trx('sss.sst_vha_hdr')
    .where(keys)
    .update({ record_status: 1 });
};

/* ================= GET HIRE VOUCHER BY VHV NO ================= */

const getHireVoucherByVhvNo = async (vhvNo) => {
  // record_status 0 = active. Soft-deleted vouchers must not be loaded for edit.
  const header = await db('sss.sst_vha_hdr')
    .where({ vha_no: vhvNo, record_status: 0 })
    .first();

  if (!header) return null;

  const details = await db('sss.sst_vha_dtl')
    .where({
      vha_no: header.vha_no,
      vha_loc: header.vha_loc,
      vha_date: header.vha_date
    })

  return { header, details };
};

/* ================= GET VENDOR BY LORRY NO ================= */

const getVendorByLorryNo = async (lorryNo) => {
  return db('sss.sst_vha_hdr')
    .select('vendor_name', 'vendor_code')
    .where({ vha_no: lorryNo })
    .first();
};

/* Manifests for a vehicle that are not already on an active hire voucher.
   currentVhaNo: when editing, keep rows already linked to this voucher. */
const getUncoveredManifestsByVehicle = async (vehicleNo, currentVhaNo, fromLoc) => {
  const veh = String(vehicleNo || '').replace(/\s+/g, '').toUpperCase();
  if (!veh) return [];

  const bindings = [veh];
  let excludeCurrent = '';
  if (currentVhaNo) {
    excludeCurrent = 'AND vh.vha_no <> ?';
    bindings.push(String(currentVhaNo));
  }
  let fromFilter = '';
  if (fromLoc) {
    fromFilter = `AND REPLACE(UPPER(TRIM(COALESCE(h.mnf_loc, ''))), ' ', '') = ?`;
    bindings.push(String(fromLoc).replace(/\s+/g, '').toUpperCase());
  }

  const result = await db.raw(
    `
    SELECT
      h.mnf_no,
      h.mnf_date,
      h.mnf_loc,
      h.mnf_to_loc,
      h.mnf_actual_wt,
      h.mnf_no_of_dwb,
      h.mnf_no_of_pkgs,
      h.desp_veh_no
    FROM sss.sst_mnf_hdr h
    WHERE REPLACE(UPPER(TRIM(COALESCE(h.desp_veh_no, ''))), ' ', '') = ?
      AND COALESCE(h.record_status, 0) = 0
      AND NOT EXISTS (
        SELECT 1
        FROM sss.sst_vha_dtl d
        INNER JOIN sss.sst_vha_hdr vh
          ON vh.vha_no = d.vha_no
         AND vh.vha_loc = d.vha_loc
         AND vh.vha_date = d.vha_date
        WHERE d.mnf_no = h.mnf_no
          AND COALESCE(d.mnf_loc, '') = COALESCE(h.mnf_loc, '')
          AND COALESCE(vh.record_status, 0) = 0
          ${excludeCurrent}
      )
      ${fromFilter}
    ORDER BY h.mnf_date, h.mnf_no
    `,
    bindings
  );
  return result.rows || [];
};

module.exports = {
  getAllHireVouchers,
  getHireVoucherByKey,
  getHireVoucherByNo,
  getHireVoucherByVhvNo,
  getHireVoucherDetails,
  getNextHireVoucherNo,
  createHireVoucher,
  updateHireVoucher,
  updateHireVoucherWithSettlement,
  updateHireVoucherDetails,
  deleteHireVoucher,
  getVendorByLorryNo,
  getUncoveredManifestsByVehicle,
  calcHireAmt,
};
