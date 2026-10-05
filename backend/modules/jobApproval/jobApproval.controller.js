const db = require('../../config/db');

const toDate = (v) => (v ? String(v).slice(0, 10) : null);
const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function fyBounds(dateStr) {
  const d = new Date(`${toDate(dateStr) || toDate(new Date())}T00:00:00`);
  const y = d.getFullYear();
  const m = d.getMonth();
  const startY = m >= 3 ? y : y - 1;
  return {
    start: `${startY}-04-01`,
    end: `${startY + 1}-03-31`,
    label: `${startY}-${String(startY + 1).slice(-2)}`,
  };
}

function monthsInclusive(fromStr, toStr) {
  const from = new Date(`${toDate(fromStr)}T00:00:00`);
  const to = new Date(`${toDate(toStr)}T00:00:00`);
  return Math.abs(12 * (from.getFullYear() - to.getFullYear()) + (from.getMonth() - to.getMonth())) + 1;
}

function parseJobDisp(disp) {
  const parts = String(disp || '')
    .split('>')
    .map((p) => p.trim());
  return {
    branch: parts[0] || '',
    fleet_no: parts[1] || '',
    lorry_no: parts[2] || '',
    job_code: parts[3] || '',
    job_date: toDate(parts[4]) || '',
    prop_amt: parts[5] || '',
    rm_amt: parts[6] || '',
    disp: String(disp || ''),
  };
}

function jobKey(h) {
  return `${h.job_branch}>${h.fleet_no || ''}>${h.lorry_no}>${h.job_code}>${toDate(h.job_date)}>${num(h.prop_amt).toFixed(2)}>${num(h.rm_amt).toFixed(2)}`;
}

module.exports = {
  async listBranches() {
    const rows = await db('sss.sst_flt_job_hdr as h')
      .leftJoin('sss.ssm_location as l', 'h.job_branch', 'l.loc_code')
      .whereRaw("coalesce(h.approved_flag, 'N') = 'R'")
      .whereNull('h.job_close_date')
      .whereRaw("h.job_date >= (CURRENT_DATE - INTERVAL '90 days')")
      .distinct('h.job_branch')
      .select('h.job_branch', 'l.loc_name', 'l.parent_loc_code')
      .orderBy('h.job_branch');
    return rows.map((r) => ({
      branch_code: r.job_branch,
      branchname: r.loc_name ? `${r.job_branch}>${r.loc_name}` : r.job_branch,
      region: r.parent_loc_code || r.job_branch,
      cntrling: r.parent_loc_code || r.job_branch,
    }));
  },

  async listJobs(branch) {
    const loc = String(branch || '').trim();
    if (!loc) return [];
    const rows = await db('sss.sst_flt_job_hdr as h')
      .leftJoin('sss.ssm_vehicle_master as v', 'v.lry_regis_no', 'h.lorry_no')
      .leftJoin(
        db('sss.sst_flt_job_dtl')
          .select('job_code', 'job_branch', 'job_date')
          .sum({ prop_amt: 'proposedamount' })
          .sum({ rm_amt: 'rm_app_amt' })
          .whereRaw("coalesce(approval_flag, 'N') = 'R'")
          .groupBy('job_code', 'job_branch', 'job_date')
          .as('d'),
        function () {
          this.on('d.job_code', '=', 'h.job_code')
            .andOn('d.job_branch', '=', 'h.job_branch')
            .andOn('d.job_date', '=', 'h.job_date');
        }
      )
      .where('h.job_branch', loc)
      .whereRaw("coalesce(h.approved_flag, 'N') = 'R'")
      .whereNull('h.job_close_date')
      .whereRaw("h.job_date >= (CURRENT_DATE - INTERVAL '90 days')")
      .select(
        'h.job_code',
        'h.job_branch',
        'h.job_date',
        'h.lorry_no',
        'v.lry_fleet_no as fleet_no',
        'd.prop_amt',
        'd.rm_amt'
      )
      .orderBy('h.job_date', 'desc')
      .orderBy('h.job_code', 'desc');

    return rows.map((r) => {
      const disp = jobKey(r);
      return {
        disp,
        job_code: r.job_code,
        job_branch: r.job_branch,
        job_date: toDate(r.job_date),
        lorry_no: r.lorry_no,
        fleet_no: r.fleet_no || '',
      };
    });
  },

  async getJob({ disp, job_code, job_branch, job_date }) {
    const parsed = disp ? parseJobDisp(disp) : {};
    const code = String(job_code || parsed.job_code || '').trim();
    const branch = String(job_branch || parsed.job_branch || parsed.branch || '').trim();
    const date = toDate(job_date || parsed.job_date);
    if (!code || !branch || !date) throw fail(400, 'Please Select JobCode !');

    const hdr = await db('sss.sst_flt_job_hdr')
      .where({ job_code: code, job_branch: branch, job_date: date })
      .first();
    if (!hdr) throw fail(404, 'Job not found');

    const loc = await db('sss.ssm_location').where({ loc_code: branch }).first();
    const lines = await db('sss.sst_flt_job_dtl as a')
      .leftJoin('sss.ssm_item_hdr as i', 'a.item_code', 'i.item_code')
      .leftJoin('sss.ssm_item_group as g', 'a.job_group_code', 'g.item_group_code')
      .where({
        'a.job_code': code,
        'a.job_branch': branch,
        'a.job_date': date,
      })
      .whereRaw("coalesce(a.approval_flag, 'N') = 'R'")
      .select(
        'a.sr_no',
        'a.job_group_code',
        'g.item_group_desc',
        'a.item_code',
        'a.item_desc',
        'a.rate',
        'a.rate_brn',
        'a.rate_rm',
        'a.quantity',
        'a.quantity_rm',
        'a.rm_app_amt',
        'a.estimateamount',
        'a.proposedamount',
        'a.approvedamount',
        'a.job_start',
        'a.job_type',
        'a.remarks',
        'a.delear_billing_code',
        'a.lorry_no',
        'i.rate as item_rate',
        'i.labor as item_labor'
      )
      .orderBy('a.sr_no');

    const mapped = [];
    for (const row of lines) {
      if (!row.job_group_code && !row.item_code) continue;
      const used = await db('sss.sst_flt_job_dtl')
        .whereRaw("upper(trim(lorry_no)) = ?", [String(row.lorry_no || hdr.lorry_no).toUpperCase()])
        .andWhere('item_code', row.item_code)
        .whereRaw("coalesce(approval_flag, 'N') = 'H'")
        .orderBy('job_date', 'desc')
        .first();
      let usedDate = '';
      if (used) {
        const qtySum = await db('sss.sst_flt_job_dtl')
          .whereRaw("upper(trim(lorry_no)) = ?", [String(row.lorry_no || hdr.lorry_no).toUpperCase()])
          .andWhere('item_code', row.item_code)
          .andWhere('job_date', used.job_date)
          .whereRaw("coalesce(approval_flag, 'N') = 'H'")
          .sum({ q: 'quantity_rm' })
          .first();
        usedDate = `${toDate(used.job_date)}(${num(qtySum?.q)})`;
      }
      const rateRm = num(row.rate_rm, num(row.rate_brn));
      const qtyRm = num(row.quantity_rm, num(row.quantity));
      const rmAmt = num(row.rm_app_amt, num(row.proposedamount));
      mapped.push({
        sr_no: row.sr_no,
        job_group_code: row.job_group_code || '',
        item_code: row.item_code || '',
        item_desc: row.item_desc || '',
        rate: num(row.rate, num(row.item_rate)),
        rate_brn: num(row.rate_brn),
        rate_rm: rateRm,
        quantity: num(row.quantity),
        quantity_rm: qtyRm,
        rm_app_amt: rmAmt,
        estimateamount: num(row.estimateamount),
        proposedamount: num(row.proposedamount),
        approvedamount: rmAmt,
        revised_rate: rateRm,
        revised_qty: qtyRm,
        job_start_date: toDate(row.job_start) || '',
        remark: row.remarks || '',
        used_date: usedDate,
        delear_billing_code: row.delear_billing_code || (String(row.item_code) === '99999' ? 'LC' : 'X'),
        action: 'A',
        item_labor: row.item_labor,
      });
    }

    return {
      job_code: hdr.job_code,
      job_branch: hdr.job_branch,
      job_date: toDate(hdr.job_date),
      lorry_no: hdr.lorry_no,
      vehicle_made: hdr.vehicle_made || '',
      region: loc?.parent_loc_code || branch,
      cntrling: loc?.parent_loc_code || branch,
      lines: mapped,
    };
  },

  async vehicleCost(lorry_no) {
    const veh = String(lorry_no || '').trim().toUpperCase();
    if (!veh) return [];
    const lorry = await db('sss.ssm_vehicle_master')
      .whereRaw("upper(trim(lry_regis_no)) = ?", [veh])
      .first();
    const rows = await db('sss.sst_flt_job_dtl as b')
      .join('sss.sst_flt_job_hdr as a', function () {
        this.on('a.job_code', '=', 'b.job_code')
          .andOn('a.job_branch', '=', 'b.job_branch')
          .andOn('a.job_date', '=', 'b.job_date');
      })
      .whereRaw("upper(trim(a.lorry_no)) = ?", [veh])
      .whereRaw("b.job_date >= DATE '2020-04-01'")
      .whereRaw("coalesce(b.approval_flag, 'N') = 'H'")
      .select(
        'b.job_date',
        'b.job_group_code',
        db.raw("coalesce(b.approvedamount, 0) as approvedamount")
      );

    const buckets = {};
    for (const r of rows) {
      const fy = fyBounds(r.job_date);
      const year = lorry?.lry_regis_year || String(new Date(r.job_date).getFullYear());
      const key = `${fy.label}|${year}`;
      if (!buckets[key]) {
        buckets[key] = {
          acYear: fy.label,
          YEAR: year,
          lorryNo: veh,
          make: lorry?.lry_make || '',
          model: lorry?.lry_model || '',
          bodyType: lorry?.lry_body_type || '',
          appTyreAmt: 0,
          appOthAmt: 0,
        };
      }
      const amt = num(r.approvedamount);
      if (String(r.job_group_code) === '1031') buckets[key].appTyreAmt += amt;
      else buckets[key].appOthAmt += amt;
    }
    return Object.values(buckets).sort((a, b) => String(a.acYear).localeCompare(String(b.acYear)));
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
      .whereRaw("d.job_date >= (CURRENT_DATE - INTERVAL '180 days')")
      .whereRaw("coalesce(h.approved_flag, 'N') in ('H', 'C')")
      .select(
        'd.sr_no',
        'd.job_type',
        'g.item_group_desc as job_desc',
        db.raw("to_char(d.job_date::date, 'YYYY-MM-DD') as job_date"),
        'd.item_desc as item',
        'd.quantity',
        'd.proposedamount as amount'
      )
      .orderBy('d.job_date', 'desc')
      .orderBy('d.sr_no', 'asc');

    return rows.map((r, i) => ({
      id: `${r.job_date}|${r.sr_no}|${i}`,
      sr_no: i + 1,
      job_type: r.job_type || '',
      job_desc: r.job_desc || '',
      job_date: toDate(r.job_date) || '',
      vendor_name: '',
      item: r.item || '',
      quantity: r.quantity ?? '',
      amount: r.amount ?? '',
    }));
  },

  async save(payload) {
    const parsed = parseJobDisp(payload.job_disp || payload.jobno);
    const job_code = String(payload.job_code || parsed.job_code || '').trim();
    const job_branch = String(payload.job_branch || parsed.branch || '').trim();
    const job_date = toDate(payload.job_date || parsed.job_date);
    const lorry_no = String(payload.lorry_no || parsed.lorry_no || '').trim();
    const lines = Array.isArray(payload.lines) ? payload.lines : [];
    const aud_user = payload.aud_user || '';

    if (!job_branch) throw fail(400, 'Please Select Branch !');
    if (!job_code || !job_date) throw fail(400, 'Please Select JobCode !');
    if (!lines.length) throw fail(400, 'Please Select JobGroup !');

    for (const l of lines) {
      if (!String(l.job_group_code || '').trim()) throw fail(400, 'Please Select JobGroup !');
      if (!String(l.item_code || '').trim()) throw fail(400, 'Please Select Item !');
      if (l.rate === '' || l.rate == null) throw fail(400, 'Please Select Rate !');
      if (l.revised_rate === '' || l.revised_rate == null) throw fail(400, 'Please Select Revised rate !');
      if (l.revised_qty === '' || l.revised_qty == null) throw fail(400, 'Please Select Quantity !');
    }

    const hdr = await db('sss.sst_flt_job_hdr')
      .where({ job_code, job_branch, job_date })
      .first();
    if (!hdr) throw fail(404, 'Job not found');
    const veh = lorry_no || hdr.lorry_no;

    const approvedNonTyre = lines
      .filter((l) => String(l.action || 'A') === 'A' && String(l.job_group_code) !== '1031')
      .reduce((s, l) => s + num(l.approved_amt, num(l.revised_rate) * num(l.revised_qty)), 0);

    if (approvedNonTyre > 0) {
      const fy = fyBounds(job_date);
      const jobRm = await db('sss.sst_flt_job_dtl')
        .where({ job_code, job_branch, job_date })
        .whereNot('job_group_code', '1031')
        .sum({ req: 'rm_app_amt' })
        .first();
      if (num(jobRm?.req) > 6000) {
        throw fail(400, 'Required additional aprroval, Job Total Expenses Amount More than 6000/- !');
      }
      const already = await db('sss.sst_flt_job_dtl')
        .whereRaw("upper(trim(lorry_no)) = ?", [String(veh).toUpperCase()])
        .whereNot('job_group_code', '1031')
        .whereRaw("coalesce(approval_flag, 'N') = 'H'")
        .whereBetween('job_date', [fy.start, fy.end])
        .sum({ tot: 'approvedamount' })
        .max({ max_job_date: 'job_date' })
        .first();
      const alreadyAmt = num(already?.tot);
      const totAppAmt = alreadyAmt + approvedNonTyre;
      const upTo = toDate(already?.max_job_date) && toDate(already.max_job_date) > job_date
        ? toDate(already.max_job_date)
        : job_date;
      const cap = monthsInclusive(fy.start, upTo) * 6000;
      if (totAppAmt > cap) {
        throw fail(
          400,
          `SRS Expenses Amount can not more than 6000/- per month.  Vehicle ${veh} request amount : ${approvedNonTyre}/- and already amount ${alreadyAmt} is approved. Required additional aprroval !`
        );
      }
    }

    const trx = await db.transaction();
    try {
      const anyApprove = lines.some((l) => String(l.action || 'A') === 'A');
      const hdrFlag = anyApprove ? 'H' : 'C';
      await trx('sss.sst_flt_job_hdr')
        .where({ job_code, job_branch, job_date })
        .update({
          approved_flag: hdrFlag,
          approved_by: aud_user,
          approved_date: trx.fn.now(),
        });

      for (const l of lines) {
        const action = String(l.action || 'A') === 'A' ? 'H' : 'C';
        const revRate = num(l.revised_rate);
        const revQty = num(l.revised_qty);
        const appAmt = num(l.approved_amt, revRate * revQty);
        const rmRate = num(l.rm_rate, l.rate_rm);
        const rmQty = num(l.rm_qty, l.quantity_rm);
        const rmAmt = num(l.rm_amt, l.rm_app_amt);

        if (action === 'H') {
          const dtl = await trx('sss.sst_flt_job_dtl')
            .where({ job_code, job_branch, job_date, sr_no: l.sr_no })
            .first();
          if (appAmt > num(dtl?.rm_app_amt, rmAmt) + 0.009) {
            throw fail(400, 'Approve Amount is grater than RM Amount found');
          }
          if (revQty > num(dtl?.quantity_rm, rmQty) + 0.0009) {
            throw fail(400, 'Approve Quantity is grater than RM Quantity found');
          }
        }

        await trx('sss.sst_flt_job_dtl')
          .where({ job_code, job_branch, job_date, sr_no: l.sr_no })
          .update({
            remarks: l.remark || '',
            approval_flag: action,
            approvedamount: appAmt,
            rate_app: revRate,
            quantity_app: revQty,
            rate_rm: rmRate,
            quantity_rm: rmQty,
            rm_app_amt: rmAmt,
            aud_user,
            aud_date: trx.fn.now(),
          });
      }

      await trx.commit();
      return { job_code, job_branch, job_date, approved_flag: hdrFlag };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },
};
