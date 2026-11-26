const db = require('../../config/db');
const { applyTenant } = require('../../utils/tenantScope');

/* ================= SAVE UNLOADING DATA ================= */

const saveUnloading = async (unloadingData, tenantId) => {
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
      docket_act_wt: parseFloat(d.docket_act_wt) || 0,
      docket_chrg_wt: parseFloat(d.docket_chrg_wt) || 0,
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
      desp_pkgs: 0,
      desp_wt: 0,
      record_created_by: headerData.record_created_by || 'ADMIN',
      record_created_on: new Date(),
    }));

    if (headerData.mnf_no) {
      const manifest = trx('sss.sst_mnf_hdr').where({ mnf_no: headerData.mnf_no, record_status: 0 });
      applyTenant(manifest, 'tenant_id', tenantId);
      if (!(await manifest.first())) {
        const err = new Error('Manifest not found');
        err.status = 404;
        throw err;
      }
    }

    for (const row of rows) {
      const docketQuery = trx('sss.sst_docket').where({ docket_no: row.docket_no });
      applyTenant(docketQuery, 'tenant_id', tenantId);
      const docket = await docketQuery.first();
      if (!docket) {
        const err = new Error(`Docket ${row.docket_no} is not available`);
        err.status = 404;
        throw err;
      }
      if (docket?.docket_to_loc) {
        row.docket_to_loc = docket.docket_to_loc;
      }
    }

    const existing = await trx('sss.sst_unloading_dtl')
      .where({ mnf_no: headerData.mnf_no })
      .whereIn('docket_no', rows.map((r) => r.docket_no))
      .select('docket_no');
    const alreadySaved = new Set(existing.map((e) => e.docket_no));
    const newRows = rows.filter((r) => !alreadySaved.has(r.docket_no));
    if (newRows.length) {
      await trx('sss.sst_unloading_dtl').insert(newRows);
    }

    const manifestKey = {
      mnf_no: headerData.mnf_no,
      mnf_loc: headerData.mnf_loc || headerData.mnf_from_loc || ''
    };

    const pending = await trx('sss.sst_mnf_dtl as d')
      .where('d.mnf_no', headerData.mnf_no)
      .whereNotExists(function () {
        this.select(db.raw('1'))
          .from('sss.sst_unloading_dtl as u')
          .whereRaw('u.mnf_no = d.mnf_no')
          .andWhereRaw('u.docket_no = d.dwb_no');
      })
      .first();

    if (manifestKey.mnf_no) {
      const arrival =
        !pending && headerData.arrival_date
          ? `${headerData.arrival_date} ${headerData.arrival_time || '00:00'}:00`
          : null;
      const arrivalUpdate = trx('sss.sst_mnf_hdr').where(manifestKey);
      applyTenant(arrivalUpdate, 'tenant_id', tenantId);
      await arrivalUpdate.update({
          mnf_arrival_time: arrival,
          aud_date: new Date(),
        });
    }

    await trx.commit();

    return { saved: rows.length };
  } catch (err) {
    await trx.rollback();
    throw err;
  }
};

/* ================= CHECK DOCKET IN UNLOADING TABLE ================= */

const isDocketUnloaded = async (docketNo, tenantId) => {
  const query = db('sss.sst_unloading_dtl as u')
    .join('sss.sst_docket as d', 'd.docket_no', 'u.docket_no')
    .where({ 'u.docket_no': docketNo });
  applyTenant(query, 'd.tenant_id', tenantId);
  const row = await query.first();
  return !!row;
};

module.exports = {
  saveUnloading,
  isDocketUnloaded
};