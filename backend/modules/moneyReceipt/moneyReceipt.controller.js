const db = require('../../config/db');

const n = (v) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

const toDate = (v) => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

const locOf = (v) => String(v || '').split(' - ')[0].trim();

const locPrefix = (loc) => String(loc || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

function formatMrNo(loc, seq) {
  const n = parseInt(seq, 10);
  const num = Number.isFinite(n) && n > 0 ? n : 1;
  return `${locPrefix(loc)}MR${String(num).padStart(6, '0')}`;
}

function normalizeMrNo(mrNo, loc) {
  const raw = String(mrNo ?? '').trim().toUpperCase();
  if (!raw || raw === 'AUTO') return null;
  const locP = locPrefix(loc);
  const prefixed = raw.match(/^([A-Z0-9]+)MR(\d+)$/);
  if (prefixed) {
    return `${prefixed[1]}MR${String(parseInt(prefixed[2], 10)).padStart(6, '0')}`;
  }
  const digits = raw.replace(/\D/g, '');
  if (digits && locP) return formatMrNo(locP, parseInt(digits, 10));
  return raw;
}

async function getNextMrNo(loc_code, trx = db) {
  const loc = locOf(loc_code);
  if (!loc) throw new Error('Billing branch is required to generate receipt number');
  const result = await trx.raw(
    `SELECT COALESCE(MAX(
       NULLIF(RIGHT(REGEXP_REPLACE(TRIM(mr_no::text), '[^0-9]', '', 'g'), 6), '')::INTEGER
     ), 0) + 1 AS next_no
     FROM sss.sst_mr_hdr
     WHERE UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))`,
    [loc]
  );
  return formatMrNo(loc, result.rows?.[0]?.next_no || 1);
}

async function listBanks() {
  return db('sss.ssm_bank_master')
    .select('rec_id', 'bank_name')
    .where({ is_active: true })
    .orderBy('bank_name');
}

async function getOutstandingInvoices({ loc_code, bp_code, bp_name, company_code }) {
  const loc = locOf(loc_code);
  const code = String(bp_code ?? '').trim();
  const name = String(bp_name ?? '').trim();
  if (!loc) return [];

  const query = db('sss.sst_invoice_hdr as h')
    .leftJoin('sss.sst_mr_dtl as r', function () {
      this.on('h.loc_code', '=', 'r.invoice_loc')
        .andOn(db.raw('CAST(h.invoice_no AS INTEGER) = CAST(r.invoice_no AS INTEGER)'))
        .andOn(db.raw('CAST(h.invoice_date AS DATE) = CAST(r.invoice_date AS DATE)'));
    })
    .whereRaw("UPPER(TRIM(h.loc_code::text)) = UPPER(TRIM(?))", [loc])
    .where(function () {
      this.whereNull('h.cancel_flag').orWhereNot('h.cancel_flag', 'Y');
    })
    .groupBy('h.invoice_no', 'h.invoice_date', 'h.loc_code', 'h.bp_code', 'h.bp_name', 'h.total_inv_amt')
    .select(
      'h.invoice_no',
      db.raw("to_char(h.invoice_date::date, 'YYYY-MM-DD') as invoice_date"),
      'h.loc_code',
      'h.bp_code',
      'h.bp_name',
      'h.total_inv_amt',
      db.raw('COALESCE(SUM(r.received_amt), 0) as already_received'),
      db.raw('COALESCE(SUM(r.tds_amt), 0) as already_tds'),
      db.raw('COALESCE(SUM(r.deduction_amt), 0) as already_deduction')
    )
    .havingRaw(
      'COALESCE(h.total_inv_amt, 0) - COALESCE(SUM(r.received_amt), 0) - COALESCE(SUM(r.tds_amt), 0) - COALESCE(SUM(r.deduction_amt), 0) > 0.009'
    )
    .orderByRaw('CAST(h.invoice_no AS INTEGER) ASC');

  if (code && code !== '0') {
    query.andWhere(function () {
      this.whereRaw('CAST(h.bp_code AS TEXT) = ?', [code]);
      if (name) this.orWhereRaw('LOWER(TRIM(h.bp_name)) = LOWER(TRIM(?))', [name]);
    });
  } else if (name) {
    query.andWhereRaw('LOWER(TRIM(h.bp_name)) = LOWER(TRIM(?))', [name]);
  } else {
    return [];
  }

  if (company_code) {
    query.andWhere((q) =>
      q.where({ 'h.company_code': company_code })
        .orWhere({ 'h.tenant_id': company_code })
        .orWhereNull('h.company_code')
        .orWhereNull('h.tenant_id')
    );
  }

  const rows = await query;
  return (rows || []).map((r) => {
    const bill = n(r.total_inv_amt);
    const rec = n(r.already_received);
    const tds = n(r.already_tds);
    const ded = n(r.already_deduction);
    const balance = Math.round((bill - rec - tds - ded) * 100) / 100;
    return {
      id: `${r.invoice_no}_${r.invoice_date}_${r.loc_code}`,
      invoice_no: String(Math.trunc(n(r.invoice_no))),
      invoice_date: r.invoice_date,
      loc_code: r.loc_code,
      bp_code: r.bp_code,
      bp_name: r.bp_name,
      bill_amt: bill.toFixed(2),
      already_received: rec.toFixed(2),
      balance: balance.toFixed(2),
      received_amt: '0.00',
      tds_amt: '0.00',
      deduction_amt: '0.00',
    };
  });
}

async function getDetails(mrNo, mrDate, loc, trx = db) {
  const no = normalizeMrNo(mrNo, loc) || String(mrNo || '').trim();
  return trx('sss.sst_mr_dtl')
    .where({ loc_code: loc })
    .andWhereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [no])
    .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [mrDate])
    .orderBy('sr_no');
}

async function getByNumber(mrNo, loc_code) {
  const loc = locOf(loc_code);
  const no = normalizeMrNo(mrNo, loc);
  if (!no || !loc) return null;
  const header = await db('sss.sst_mr_hdr')
    .whereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [no])
    .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [loc])
    .orderBy('mr_date', 'desc')
    .first();
  if (!header) return null;
  const details = await getDetails(header.mr_no, header.mr_date, header.loc_code);
  return { ...header, details };
}

async function saveReceipt(payload = {}, company_code = null, userId = null) {
  const { header = {}, details = [] } = payload;
  const loc = locOf(header.loc_code);
  if (!loc) throw new Error('Branch is required');
  if (!header.mr_date) throw new Error('Receipt date is required');
  if (!header.bp_name && !header.bp_code) throw new Error('Customer is required');

  const lines = (Array.isArray(details) ? details : []).filter((d) => n(d.received_amt) > 0 || n(d.tds_amt) > 0 || n(d.deduction_amt) > 0);
  if (!lines.length) throw new Error('Select at least one bill and enter received amount');

  const trx = await db.transaction();
  try {
    let mrNo = normalizeMrNo(header.mr_no, loc);
    if (!mrNo) mrNo = await getNextMrNo(loc, trx);

    const existing = await trx('sss.sst_mr_hdr')
      .where({ loc_code: loc })
      .andWhereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [mrNo])
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [toDate(header.mr_date)])
      .first();

    const recSum = lines.reduce((s, d) => s + n(d.received_amt), 0);
    const tdsSum = lines.reduce((s, d) => s + n(d.tds_amt), 0);
    const dedSum = lines.reduce((s, d) => s + n(d.deduction_amt), 0);

    const hdr = {
      company_code: company_code || header.company_code || null,
      tenant_id: company_code || header.tenant_id || null,
      division_code: header.division_code || null,
      loc_code: loc,
      mr_no: mrNo,
      mr_date: toDate(header.mr_date),
      bp_code: n(header.bp_code) || 0,
      bp_name: header.bp_name || null,
      pay_mode: header.pay_mode || 'CASH',
      instr_no: header.instr_no || null,
      instr_date: toDate(header.instr_date),
      bank_name: header.bank_name || null,
      received_amt: Math.round(recSum * 100) / 100,
      tds_amt: Math.round(tdsSum * 100) / 100,
      deduction_amt: Math.round(dedSum * 100) / 100,
      remarks: header.remarks || null,
      modified_by: userId || null,
      modified_on: new Date(),
    };

    let saved;
    if (existing) {
      [saved] = await trx('sss.sst_mr_hdr')
        .where({ record_id: existing.record_id })
        .update(hdr)
        .returning('*');
      await trx('sss.sst_mr_dtl')
        .where({ loc_code: loc, mr_no: existing.mr_no })
        .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date])
        .del();
    } else {
      hdr.created_by = userId || null;
      hdr.created_on = new Date();
      [saved] = await trx('sss.sst_mr_hdr').insert(hdr).returning('*');
    }

    const detailRows = lines.map((d, i) => ({
      company_code: hdr.company_code,
      loc_code: loc,
      mr_no: saved.mr_no,
      mr_date: saved.mr_date,
      sr_no: i + 1,
      invoice_no: n(d.invoice_no),
      invoice_date: toDate(d.invoice_date),
      invoice_loc: d.invoice_loc || loc,
      bill_amt: n(d.bill_amt),
      received_amt: n(d.received_amt),
      tds_amt: n(d.tds_amt),
      deduction_amt: n(d.deduction_amt),
      created_by: userId || null,
    }));
    if (detailRows.length) await trx('sss.sst_mr_dtl').insert(detailRows);

    await trx.commit();
    const detailsOut = await getDetails(saved.mr_no, saved.mr_date, saved.loc_code);
    return { header: saved, details: detailsOut };
  } catch (e) {
    await trx.rollback();
    throw e;
  }
}

async function deleteReceipt(mrNo, mrDate, loc_code) {
  const loc = locOf(loc_code);
  const trx = await db.transaction();
  try {
    const no = normalizeMrNo(mrNo, loc) || String(mrNo || '').trim();
    const existing = await trx('sss.sst_mr_hdr')
      .where({ loc_code: loc })
      .andWhereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [no])
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [toDate(mrDate)])
      .first();
    if (!existing) {
      await trx.rollback();
      return 0;
    }
    await trx('sss.sst_mr_dtl')
      .where({ loc_code: loc, mr_no: existing.mr_no })
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date])
      .del();
    const deleted = await trx('sss.sst_mr_hdr').where({ record_id: existing.record_id }).del();
    await trx.commit();
    return deleted;
  } catch (e) {
    await trx.rollback();
    throw e;
  }
}

module.exports = {
  listBanks,
  getOutstandingInvoices,
  getByNumber,
  saveReceipt,
  deleteReceipt,
};
