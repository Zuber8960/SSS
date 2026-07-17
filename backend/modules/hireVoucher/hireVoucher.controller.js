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

  const trx = await db.transaction();
  try {
    // Build header row
    const headerRow = {
      ...headerData,
      vha_no: nextNo,
      aud_date: new Date(),
    };

    // Insert header
    await trx('sss.sst_vha_hdr').insert(headerRow);

    // Build detail rows with composite key
    const detailRows = detailsData.map((row, index) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || null,
      vha_no: nextNo,
      vha_loc: headerData.vha_loc || headerData.from_loc,
      vha_date: headerData.vha_date,     
      aud_user: headerData.aud_user || '',
      aud_loc: headerData.aud_loc || '',
      aud_date: new Date(),
      ...row
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
      vhv_no: row.vhv_no,
      date: row.date || null,
      loc: row.loc || '',
      to: row.to || '',
      city: row.city || '',
      veh: row.veh || '',
      order: row.order || '',
      pickup: row.pickup || '',
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
