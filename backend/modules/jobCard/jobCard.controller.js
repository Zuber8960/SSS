const db = require('../../config/db');

const toDate = (v) => (v ? String(v).slice(0, 10) : null);
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const JOB_TYPE_LABEL = {
  PM: 'PREVENTIVE MAINTENANCE',
  N: 'NORMAL',
  A: 'ACCIDENTAL',
  AMC: 'AMC CHARGES',
};

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function parseVehicleNo(raw) {
  const s = String(raw || '').trim().toUpperCase();
  if (!s) return '';
  if (s.includes('>')) {
    const parts = s.split('>').map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[1] : parts[0];
  }
  return s;
}

async function peekJobNo(loc_code) {
  const row = await db('sss.ssm_doc_series')
    .where({ loc_code, doc_type: 'SRS' })
    .first();
  const n = Number(row?.last_upd_no || 0) + 1;
  return `${loc_code}${String(n).padStart(6, '0')}`;
}

async function allocateJobNo(trx, loc_code) {
  let row = await trx('sss.ssm_doc_series')
    .where({ loc_code, doc_type: 'SRS' })
    .forUpdate()
    .first();
  if (!row) {
    await trx('sss.ssm_doc_series').insert({
      loc_code,
      doc_type: 'SRS',
      last_upd_no: 0,
      last_upd_date: trx.fn.now(),
    });
    row = await trx('sss.ssm_doc_series')
      .where({ loc_code, doc_type: 'SRS' })
      .forUpdate()
      .first();
  }
  const n = Number(row.last_upd_no || 0) + 1;
  await trx('sss.ssm_doc_series')
    .where({ loc_code, doc_type: 'SRS' })
    .update({ last_upd_no: n, last_upd_date: trx.fn.now() });
  return `${loc_code}${String(n).padStart(6, '0')}`;
}

module.exports = {
  async listLorries(loc_code) {
    const loc = String(loc_code || '').trim();
    const query = db('sss.ssm_vehicle_master')
      .select('lry_regis_no', 'lry_branch_code', 'lry_fleet_no', 'lry_make')
      .whereNotNull('lry_fleet_no')
      .where('lry_fleet_no', '<>', '')
      .orderBy('lry_regis_no');
    if (loc) query.andWhere('lry_branch_code', loc);
    const rows = await query;
    return rows.map((r) => ({
      vehicle_no: r.lry_regis_no,
      branch: r.lry_branch_code || '',
      fleet_no: r.lry_fleet_no || '',
      make: r.lry_make || '',
      label: `${r.lry_branch_code || ''} > ${r.lry_regis_no} > ${r.lry_fleet_no || ''}`,
    }));
  },

  async lookupLorry({ lorry_no, loc_code }) {
    const vehicleNo = parseVehicleNo(lorry_no);
    if (!vehicleNo) throw fail(400, 'Please enter Lorry No');
    const loc = String(loc_code || '').trim();

    let row = await db('sss.ssm_vehicle_master')
      .whereRaw("upper(trim(lry_regis_no)) = ?", [vehicleNo])
      .modify((q) => {
        if (loc) q.andWhere('lry_branch_code', loc);
      })
      .whereNotNull('lry_fleet_no')
      .where('lry_fleet_no', '<>', '')
      .first();

    if (!row) {
      row = await db('sss.ssm_vehicle_master')
        .whereRaw("upper(trim(lry_regis_no)) = ?", [vehicleNo])
        .whereNotNull('lry_fleet_no')
        .where('lry_fleet_no', '<>', '')
        .first();
    }

    if (!row) throw fail(400, 'Lorry No is not Exist!!!');

    const hold = await db('sss.sst_flt_job_hdr')
      .whereRaw("upper(trim(lorry_no)) = ?", [vehicleNo])
      .andWhere('approved_flag', 'H')
      .modify((q) => {
        if (loc) q.andWhere('job_branch', loc);
      })
      .count('* as cnt')
      .first();
    if (Number(hold?.cnt || 0) > 0) {
      throw fail(400, 'Please finalize the previous job card for this lorry');
    }

    const lastKm = await db('sss.sst_flt_job_hdr')
      .whereRaw("upper(trim(lorry_no)) = ?", [vehicleNo])
      .orderBy('job_date', 'desc')
      .orderBy('record_id', 'desc')
      .select('km_from')
      .first();

    const job_branch = loc || row.lry_branch_code || '';
    const job_code = job_branch ? await peekJobNo(job_branch) : '';

    return {
      lorry_no: row.lry_regis_no,
      branch: row.lry_branch_code || job_branch,
      make: row.lry_make || '',
      engine_no: row.lry_engine_no || '',
      chassis_no: row.lry_chasis_no || '',
      vehicle_type: 'N/A',
      km_from: lastKm?.km_from ?? '',
      job_code,
    };
  },

  async nextJobNo(loc_code) {
    const loc = String(loc_code || '').trim();
    if (!loc) throw fail(400, 'Branch is required');
    return { job_code: await peekJobNo(loc) };
  },

  async listHistory(lorry_no) {
    const vehicleNo = String(lorry_no || '').trim().toUpperCase();
    if (!vehicleNo) return [];
    const rows = await db('sss.sst_flt_job_dtl as d')
      .leftJoin('sss.sst_flt_job_hdr as h', function () {
        this.on('d.job_code', '=', 'h.job_code')
          .andOn('d.job_branch', '=', 'h.job_branch')
          .andOn('d.job_date', '=', 'h.job_date');
      })
      .leftJoin('sss.ssm_item_group as g', 'd.job_group_code', 'g.item_group_code')
      .whereRaw("upper(trim(d.lorry_no)) = ?", [vehicleNo])
      .whereRaw("d.job_date >= (CURRENT_DATE - INTERVAL '460 days')")
      .select(
        'd.sr_no',
        'd.job_type',
        'g.item_group_desc as job_desc',
        db.raw("to_char(d.job_date::date, 'YYYY-MM-DD') as job_date"),
        'd.item_desc as item',
        'd.quantity',
        'd.proposedamount as amount',
        'h.km_from'
      )
      .orderBy('d.job_date', 'desc')
      .orderBy('d.sr_no', 'asc');

    return rows.map((r, i) => {
      const km = num(r.km_from, 0);
      return {
        id: `${r.job_date}|${r.sr_no}|${i}`,
        sr_no: i + 1,
        job_type: r.job_type || '',
        job_desc: r.job_desc || '',
        job_date: toDate(r.job_date) || '',
        vendor_name: '',
        item: r.item || '',
        quantity: r.quantity ?? '',
        amount: r.amount ?? '',
        km_from: r.km_from ?? '',
        item_life: 0,
        due_kms: km,
      };
    });
  },

  async save(payload) {
    const loc_code = String(payload.job_branch || payload.loc_code || '').trim();
    const lorry_no = parseVehicleNo(payload.lorry_no);
    const job_date = toDate(payload.job_date);
    const jobTypeCode = payload.job_type_code || 'N';
    const job_type = JOB_TYPE_LABEL[jobTypeCode] || String(payload.job_type || 'NORMAL').toUpperCase();
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const aud_user = payload.aud_user || '';

    if (!lorry_no) throw fail(400, 'Please enter Lorry No');
    if (!loc_code) throw fail(400, 'Branch is required');
    if (!job_date) throw fail(400, 'Please enter Job Date');
    if (!String(payload.driver_code || '').trim()) throw fail(400, 'Please enter Driver Name');

    const lorry = await db('sss.ssm_vehicle_master')
      .whereRaw("upper(trim(lry_regis_no)) = ?", [lorry_no])
      .whereNotNull('lry_fleet_no')
      .where('lry_fleet_no', '<>', '')
      .first();
    if (!lorry) throw fail(400, 'Lorry No is not Exist!!!');

    const filled = lines.filter((l) => String(l.job_group_code || '').trim() && String(l.item_code || '').trim());
    if (!filled.length) throw fail(400, 'Please fill at least one job group and item');

    for (let i = 0; i < filled.length; i++) {
      const l = filled[i];
      if (!l.job_start) throw fail(400, `Please fill Job Start Date at row ${i + 1}`);
    }

    const trx = await db.transaction();
    try {
      const job_code = await allocateJobNo(trx, loc_code);
      const tot_est_amt = filled.reduce((s, l) => s + num(l.estimateamount), 0);
      const tot_prop_amt = filled.reduce((s, l) => s + num(l.proposedamount), 0);

      await trx('sss.sst_flt_job_hdr').insert({
        job_code,
        job_branch: loc_code,
        job_date,
        lorry_no,
        driver_code: payload.driver_code || '',
        vehicle_made: payload.vehicle_made || lorry.lry_make || '',
        chasis_no: payload.chassis_no || lorry.lry_chasis_no || '',
        engine_no: payload.engine_no || lorry.lry_engine_no || '',
        km_from: payload.km_from === '' || payload.km_from == null ? null : num(payload.km_from),
        vehicle_type: payload.vehicle_type || 'N/A',
        job_supervisor_code: payload.job_supervisor_code || '',
        job_supervisor_name: payload.job_supervisor_name || '',
        job_type,
        approved_flag: 'R',
        tot_est_amt,
        tot_prop_amt,
        aud_user,
        aud_date: trx.fn.now(),
      });

      let sr = 1;
      for (const l of filled) {
        const qty = num(l.quantity);
        const rate = num(l.rate);
        const rev = num(l.rate_brn, rate);
        const est = num(l.estimateamount, qty * rate);
        const prop = num(l.proposedamount, qty * rev);
        await trx('sss.sst_flt_job_dtl').insert({
          job_code,
          job_branch: loc_code,
          job_date,
          lorry_no,
          sr_no: sr,
          job_group_code: l.job_group_code,
          item_code: l.item_code,
          item_desc: l.item_desc || '',
          job_start: toDate(l.job_start),
          job_start_time: `${String(l.start_hr || '00').padStart(2, '0')}:${String(l.start_min || '00').padStart(2, '0')}`,
          estimateamount: est,
          proposedamount: prop,
          job_type,
          estimatetime: num(l.estimatetime),
          quantity: qty,
          rate,
          rate_brn: rev,
          labour: num(l.labour),
          rate_rm: rev,
          quantity_rm: qty,
          rm_app_amt: prop,
          gst_rate: num(l.gst_rate, null),
          approval_flag: 'R',
          aud_user,
          aud_date: trx.fn.now(),
        });
        sr += 1;
      }

      await trx.commit();
      return { job_code, job_branch: loc_code, job_date, tot_est_amt, tot_prop_amt };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },
};
