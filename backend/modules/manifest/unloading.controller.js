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
      docket_act_wt: parseFloat(d.docket_act_wt) ||  0,
      docket_chrg_wt: parseFloat(d.docket_chrg_wt) ||  0,
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
      desp_pkgs: parseFloat(d.received_pkgs) || null,
      desp_wt: parseFloat(d.desp_wt) || null,
      record_created_by: headerData.record_created_by || 'ADMIN',
      record_created_on: new Date(),
    }));

    // Insert all unloading records
    await trx('sss.sst_unloading_dtl').insert(rows);


    const manifestKey = {
      mnf_no: headerData.mnf_no,
      mnf_loc: headerData.mnf_loc || headerData.mnf_from_loc || ''
    };

    if (manifestKey.mnf_no) {
      await trx('sss.sst_mnf_hdr')
        .where(manifestKey)
        .update({
          mnf_arrival_time: `${headerData.arrival_date} ${headerData.arrival_time}:00` || null,
          aud_date: new Date(),
        });
    }

    // ─────────────────────────────────────────────────────────
    // 3. Update docket header with received pkgs, weight, and arrival time
    // ─────────────────────────────────────────────────────────
    for (const row of rows) {
      if (row.docket_no) {
        // Build the docket key — try to match by docket_no + docket_loc + docket_date
        const docketKey = {
          docket_no: row.docket_no,
        };
        if (row.docket_from_loc) docketKey.docket_loc = row.docket_from_loc;
        if (row.docket_date) docketKey.docket_date = row.docket_date;

        await trx('sss.sst_docket')
          .where(docketKey)
          .update({
            desp_pkgs: row.pkgs_received,
            aud_date: new Date(),
          });
      }
    }

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