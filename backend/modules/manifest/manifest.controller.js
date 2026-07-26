const db = require('../../config/db');

/* ================= GET ALL MANIFESTS ================= */

const getAllManifests = async () => {
  return db('sss.sst_mnf_hdr')
    .select('*')
    .where({ record_status: 0 })
    .orderBy('aud_date', 'desc');
};

/* ================= GET MANIFEST BY KEY (composite) ================= */

const getManifestByKey = async ({ mnf_no, mnf_loc, mnf_date }) => {
  return db('sss.sst_mnf_hdr')
    .where({ mnf_no, mnf_loc, mnf_date, record_status: 0 })
    .first();
};

/* ================= GET MANIFEST BY NO ONLY (for edit/view) ================= */

const getManifestByNo = async (mnf_no) => {
  return db('sss.sst_mnf_hdr')
    .where({ mnf_no })
    .first();
};

const getManifestByLocation = async (loc) => {
  return db('sss.sst_mnf_hdr')
    .where({ mnf_loc: loc });
};

/* ================= GET MANIFEST DETAILS ================= */

const getManifestDetails = async ({ mnf_no, mnf_loc, mnf_date }) => {
  return db('sss.sst_mnf_dtl')
    .where({ mnf_no, mnf_loc, mnf_date })
    .orderBy('mnf_srno');
};

/* ================= GENERATE NEXT MANIFEST NO ================= */

const getNextManifestNo = async () => {
  const result = await db.raw(
    "SELECT COALESCE(MAX(CAST(mnf_no AS INTEGER)), 0) + 1 AS next_no FROM sss.sst_mnf_hdr"
  );
  const nextNo = result.rows?.[0]?.next_no || 1;
  return String(nextNo);
};

/* ================= CREATE MANIFEST (header + details in transaction) ================= */

const createManifest = async (headerData, detailsData) => {
  const trx = await db.transaction();
  try {
    // Generate next manifest no
    const nextNo = await getNextManifestNo();

    // Build header row
    const headerRow = {
      ...headerData,
      mnf_no: nextNo,
      aud_date: new Date(),
      ...(headerData.mnf_no ? {} : {}),
    };

    // Insert header
    await trx('sss.sst_mnf_hdr').insert(headerRow);

    // Filter out detail rows with missing required fields (NOT NULL columns)
    const validDetails = detailsData.filter(row =>
      row.dwb_no && row.dwb_no.toString().trim() !== '' &&
      row.dwb_date && row.dwb_date.toString().trim() !== '' &&
      row.dwb_loc && row.dwb_loc.toString().trim() !== '' &&
      row.dwb_to_loc && row.dwb_to_loc.toString().trim() !== ''
    );

    // Build detail rows with composite key
    const detailRows = validDetails.map((row, index) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || null,
      mnf_no: nextNo,
      mnf_loc: headerData.mnf_loc,
      mnf_date: headerData.mnf_date,
      mnf_srno: index + 1,
      dwb_no: row.dwb_no,
      dwb_date: row.dwb_date,
      dwb_loc: row.dwb_loc,
      dwb_to_loc: row.dwb_to_loc,
      dwb_pkgs: parseFloat(row.dwb_pkgs) || 0,
      dwb_charged_wt: parseFloat(row.dwb_charged_wt) || 0,
      dwb_actual_wt: parseFloat(row.dwb_actual_wt) || 0,
      mnf_pkgs: parseFloat(row.mnf_pkgs) || 0,
      aud_user: headerData.aud_user || '',
      aud_loc: headerData.aud_loc || '',
      aud_date: new Date(),
    }));

    // Insert details
    if (detailRows.length > 0) {
      await trx('sss.sst_mnf_dtl').insert(detailRows);
    }

    await trx.commit();
    return { ...headerRow, mnf_no: nextNo };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= UPDATE MANIFEST ================= */

const updateManifest = async (keys, data, trx = db) => {
  return trx('sss.sst_mnf_hdr')
    .where(keys)
    .update({
      ...data,
      aud_date: new Date()
    });
};

/* ================= UPDATE MANIFEST DETAILS (delete all + re-insert) ================= */

const updateManifestDetails = async (keys, detailsData) => {
  const trx = await db.transaction();
  try {
    // Delete existing details
    await trx('sss.sst_mnf_dtl')
      .where(keys)
      .del();

    // Filter out detail rows with missing required fields (NOT NULL columns)
    const validDetails = detailsData.filter(row =>
      row.dwb_no && row.dwb_no.toString().trim() !== '' &&
      row.dwb_date && row.dwb_date.toString().trim() !== '' &&
      row.dwb_loc && row.dwb_loc.toString().trim() !== '' &&
      row.dwb_to_loc && row.dwb_to_loc.toString().trim() !== ''
    );

    // Insert new details
    const detailRows = validDetails.map((row, index) => ({
      company_code: row.company_code || null,
      division_code: row.division_code || null,
      mnf_no: keys.mnf_no,
      mnf_loc: keys.mnf_loc,
      mnf_date: keys.mnf_date,
      mnf_srno: index + 1,
      dwb_no: row.dwb_no,
      dwb_date: row.dwb_date,
      dwb_loc: row.dwb_loc,
      dwb_to_loc: row.dwb_to_loc,
      dwb_pkgs: parseFloat(row.dwb_pkgs) || 0,
      dwb_charged_wt: parseFloat(row.dwb_charged_wt) || 0,
      dwb_actual_wt: parseFloat(row.dwb_actual_wt) || 0,
      mnf_pkgs: parseFloat(row.mnf_pkgs) || 0,
      aud_user: row.aud_user || '',
      aud_loc: keys.mnf_loc,
      aud_date: new Date(),
    }));

    if (detailRows.length > 0) {
      await trx('sss.sst_mnf_dtl').insert(detailRows);
    }

    await trx.commit();
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= GET MANIFESTS BY DOCKET NO (search in mnf_dtl + join with mnf_hdr) ================= */

const getManifestsByDocketNo = async (docketNo) => {
  return db('sss.sst_mnf_dtl as dtl')
    .join('sss.sst_mnf_hdr as hdr', function () {
      this.on('dtl.mnf_no', '=', 'hdr.mnf_no')
        .andOn('dtl.mnf_loc', '=', 'hdr.mnf_loc')
        .andOn('dtl.mnf_date', '=', 'hdr.mnf_date');
    })
    .where({ 'dtl.dwb_no': docketNo})
    .select(
      'hdr.*'
    )
    .orderBy('hdr.aud_date', 'desc');
};

/* ================= DELETE MANIFEST (soft) ================= */

const deleteManifest = async (keys, trx = db) => {
  return trx('sss.sst_mnf_hdr')
    .where(keys)
    .update({ record_status: 1 });
};

module.exports = {
  getAllManifests,
  getManifestByKey,
  getManifestByNo,
  getManifestDetails,
  getNextManifestNo,
  createManifest,
  updateManifest,
  updateManifestDetails,
  getManifestsByDocketNo,
  deleteManifest,
  getManifestByLocation
};
