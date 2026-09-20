const db = require('../../config/db');

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

const getHireVoucherDetails = async ({ vha_no, vha_loc, vha_date }) => {
  return db('sss.sst_vha_dtl')
    .where({ vha_no, vha_loc, vha_date })
    .orderBy('vhv_srno');
};

/* ================= GENERATE NEXT HIRE VOUCHER NO ================= */

const getNextHireVoucherNo = async () => {
  const result = await db.raw(
    "SELECT COALESCE(MAX(CAST(vha_no AS INTEGER)), 0) + 1 AS next_no FROM sss.sst_vha_hdr"
  );
  const nextNo = result.rows?.[0]?.next_no || 1;
  return String(nextNo);
};

/* ================= CREATE HIRE VOUCHER (header + details in transaction) ================= */

const createHireVoucher = async (headerData, detailsData) => {
  // Generate next vha no BEFORE starting the transaction
  const nextNo = await getNextHireVoucherNo();

  // ── Header: computed amounts (server-side source of truth) ──
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const hireAmt = n(headerData.vha_hire_amt);
  const loadingAmt = n(headerData.vha_loading_amt);
  const dcAmt = n(headerData.vha_dc_amt);
  const grossAmt = n(headerData.vha_total_amt) || hireAmt + loadingAmt + dcAmt;
  const advDiesel = n(headerData.vha_advance_diesel);
  const advCash = n(headerData.vha_advance_cash);
  const advTotal = n(headerData.vha_advance_total) || advDiesel + advCash;
  const tdsAmt = n(headerData.vha_tds_amt);
  const advNet = advTotal - tdsAmt;

  const trx = await db.transaction();
  try {
    // Build header row (only known sst_vha_hdr columns are accepted)
    const headerRow = {
      ...headerData,
      vha_no: nextNo,
      // NOT NULL columns — always defaulted
      vha_loc: headerData.vha_loc || '',
      vha_to_loc: headerData.vha_to_loc || '',
      vha_to_loc_state: headerData.vha_to_loc_state || '',
      // numeric columns — cast to numbers (vha_rate_uom is numeric: 1=Fixed, 2=Per Kg, 3=Per Ton, 4=Per Trip)
      dwb_actual_weight: headerData.dwb_actual_weight != null && headerData.dwb_actual_weight !== "" ? Number(headerData.dwb_actual_weight) : null,
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
      vha_balance_amt: n(headerData.vha_balance_amt) || grossAmt - advTotal - tdsAmt,
      aud_date: new Date(),
    };

    // Insert header
    await trx('sss.sst_vha_hdr').insert(headerRow);

    // Build detail rows with composite key (only sst_vha_dtl columns)
    const detailRows = (detailsData || []).map((row, index) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || null,
      vha_no: nextNo,
      vha_loc: headerData.vha_loc || headerData.from_loc || null,
      vha_date: headerData.vha_date,
      mnf_no: row.mnf_no || null,
      mnf_date: row.mnf_date || null,
      mnf_loc: row.mnf_loc || null,
      mnf_act_weight: row.mnf_act_weight != null && row.mnf_act_weight !== "" ? Number(row.mnf_act_weight) : null,
      mnf_cns_no: row.mnf_cns_no != null && row.mnf_cns_no !== "" ? Number(row.mnf_cns_no) : null,
      mnf_pkgs_no: row.mnf_pkgs_no != null && row.mnf_pkgs_no !== "" ? Number(row.mnf_pkgs_no) : null,
      aud_user: headerData.aud_user || '',
      aud_loc: headerData.vha_loc || headerData.from_loc || '',
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
    const detailRows = detailsData.map((row, index) => ({
      company_code: row.company_code || null,
      division_code: row.division_code || null,
      vha_no: keys.vha_no,
      vha_loc: keys.vha_loc,
      vha_date: keys.vha_date,
      vhv_srno: index + 1,
      mnf_no: row.mnf_no || null,
      mnf_date: row.mnf_date || null,
      mnf_loc: row.mnf_loc || null,
      mnf_act_weight: row.mnf_act_weight != null && row.mnf_act_weight !== "" ? Number(row.mnf_act_weight) : null,
      mnf_cns_no: row.mnf_cns_no != null && row.mnf_cns_no !== "" ? Number(row.mnf_cns_no) : null,
      mnf_pkgs_no: row.mnf_pkgs_no != null && row.mnf_pkgs_no !== "" ? Number(row.mnf_pkgs_no) : null,
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
  const header = await db('sss.sst_vha_hdr')
    .where({ vha_no: vhvNo })
    .first();

  if (!header) return null;

  const details = await db('sss.sst_vha_dtl')
    .where({
      vha_no: header.vha_no,
      vha_loc: header.vha_loc || header.from_loc,
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

module.exports = {
  getAllHireVouchers,
  getHireVoucherByKey,
  getHireVoucherByNo,
  getHireVoucherByVhvNo,
  getHireVoucherDetails,
  getNextHireVoucherNo,
  createHireVoucher,
  updateHireVoucher,
  updateHireVoucherDetails,
  deleteHireVoucher,
  getVendorByLorryNo
};
