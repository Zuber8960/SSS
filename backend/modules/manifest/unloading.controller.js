const db = require('../../config/db');

/* ================= SAVE UNLOADING DATA ================= */

const saveUnloading = async (unloadingData) => {
  const trx = await db.transaction();
  try {
    const { dockets, ...headerData } = unloadingData;

    if (!dockets || !dockets.length) {
      throw new Error('No docket data provided for unloading');
    }

    const rows = dockets.map((d) => ({
      company_code: headerData.company_code || null,
      division_code: headerData.division_code || '1',
      arrival_date: headerData.arrival_date || null,
      unld_loc_code: headerData.unld_loc_code || headerData.mnf_to_loc || headerData.dest_branch || '',
      docket_no: d.docket_no,
      docket_from_loc: d.docket_from_loc || d.dwb_loc || headerData.mnf_from_loc || '',
      docket_to_loc: d.docket_to_loc || d.dwb_to_loc || headerData.mnf_to_loc || '',
      docket_date: d.docket_date || d.dwb_date || headerData.mnf_date || null,
      docket_pkgs: parseFloat(d.booked_pkgs) || 0,
      docket_act_wt: parseFloat(d.weight) || parseFloat(d.dwb_actual_wt) || 0,
      docket_chrg_wt: parseFloat(d.dwb_charged_wt) || parseFloat(d.weight) || 0,
      mnf_no: headerData.mnf_no,
      mnf_from_loc: headerData.mnf_from_loc || headerData.mnf_loc || '',
      mnf_to_loc: headerData.mnf_to_loc || headerData.dest_branch || '',
      mnf_date: headerData.mnf_date || null,
      remark: d.unloading_remarks || d.remarks || '',
      weight_received: parseFloat(d.weight) || parseFloat(d.dwb_actual_wt) || 0,
      pkgs_received: parseInt(d.received_pkgs) || 0,
      short_pkgs: parseInt(d.short_qty) || 0,
      excess_pkgs: parseInt(d.excess_qty) || 0,
      damage_pkgs: parseInt(d.damage_qty) || 0,
      damage_hold: parseInt(d.damage_hold) || 0,
      document_hold: parseInt(d.document_hold) || 0,
      part_hold: parseInt(d.part_hold) || 0,
      dispatch_flag: d.dispatch_flag || null,
      desp_pkgs: parseFloat(d.desp_pkgs) || null,
      desp_wt: parseFloat(d.desp_wt) || null,
      record_created_by: headerData.record_created_by || 'ADMIN',
      record_created_on: new Date(),
    }));

    // Insert all unloading records
    await trx('sss.sst_unloading_dtl').insert(rows);

    await trx.commit();
    return { saved: rows.length };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

module.exports = {
  saveUnloading
};