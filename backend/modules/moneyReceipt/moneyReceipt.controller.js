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

async function getOutstandingDockets({ loc_code, bp_code, bp_name, bp_id, mr_reason }) {
  const loc = locOf(loc_code);
  const reason = parseInt(mr_reason, 10);
  const code = String(bp_code ?? '').trim();
  const name = String(bp_name ?? '').trim();
  const bpId = String(bp_id ?? '').trim();
  if (!loc || (reason !== 1 && reason !== 2)) return [];
  if (!name && (!code || code === '0') && !bpId) return [];

  const payType = reason === 1 ? 'PAID' : 'TO PAY';
  const partyIdCol = reason === 1 ? 'd.cnor_id' : 'd.cnee_id';
  const locClause = reason === 1
    ? 'UPPER(TRIM(d.docket_loc::text)) = UPPER(TRIM(?))'
    : 'UPPER(TRIM(COALESCE(d.docket_to_loc, \'\')::text)) = UPPER(TRIM(?))';

  const params = [payType, loc];
  const extraWhere = [];

  if (reason === 2) {
    extraWhere.push(`EXISTS (
      SELECT 1 FROM sss.sst_dly_note n
      WHERE UPPER(TRIM(n.docket_no::text)) = UPPER(TRIM(d.docket_no::text))
        AND UPPER(TRIM(COALESCE(n.docket_to_loc, d.docket_to_loc, '')::text)) = UPPER(TRIM(?))
        AND LOWER(TRIM(COALESCE(n.delivery_status, ''))) ~ '(deliver|dly|closed|complete|^y$|^yes$)'
        AND LOWER(TRIM(COALESCE(n.delivery_status, ''))) !~ '(un|not |pending|cancel)'
    )`);
    params.push(loc);
  }

  const partyParts = [];
  if (reason === 2) {
    if (code && code !== '0') {
      partyParts.push(`TRIM(CAST(bp.bp_grp_code AS TEXT)) = TRIM(?)`);
      params.push(code);
    }
    if (bpId && bpId !== '0') {
      partyParts.push(`CAST(d.cnee_id AS TEXT) = ?`);
      params.push(bpId);
    }
  } else {
    if (name) {
      partyParts.push(`LOWER(TRIM(COALESCE(bp.bp_name, ''))) = LOWER(TRIM(?))`);
      params.push(name);
    }
    if (code && code !== '0') {
      partyParts.push(`CAST(bp.bp_grp_code AS TEXT) = ?`);
      params.push(code);
    }
    if (bpId && bpId !== '0') {
      partyParts.push(`CAST(${partyIdCol} AS TEXT) = ?`);
      params.push(bpId);
    }
  }
  if (!partyParts.length) return [];

  const partyClause = reason === 2 && partyParts.length > 1
    ? partyParts.join(' AND ')
    : partyParts.join(' OR ');

  const result = await db.raw(
    `SELECT
        d.docket_no::text AS docket_no,
        to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
        d.docket_loc,
        d.docket_to_loc,
        d.docket_pickup_town AS docket_from_town,
        d.docket_dly_town AS docket_to_town,
        d.docket_pay_type,
        COALESCE(d.docket_tot_amt, 0) AS docket_tot_amt,
        bp.bp_name AS party_name
      FROM sss.sst_docket d
      LEFT JOIN sss.ssm_business_partner bp
        ON CAST(bp.record_id AS TEXT) = CAST(${partyIdCol} AS TEXT)
      WHERE COALESCE(d.record_status, 0) = 0
        AND UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = ?
        AND ${locClause}
        ${extraWhere.length ? `AND ${extraWhere.join(' AND ')}` : ''}
        AND COALESCE(d.docket_tot_amt, 0) > 0.009
        AND NOT EXISTS (
          SELECT 1 FROM sss.sst_mr_dtl r
          WHERE UPPER(TRIM(COALESCE(r.docket_no, '')::text)) = UPPER(TRIM(d.docket_no::text))
            AND UPPER(TRIM(COALESCE(r.docket_loc, '')::text)) = UPPER(TRIM(d.docket_loc::text))
        )
        AND (${partyClause})
      ORDER BY d.docket_date ASC, d.docket_no ASC`,
    params
  );

  return (result.rows || []).map((r) => {
    const bill = n(r.docket_tot_amt);
    return {
      id: `${r.docket_no}_${r.docket_date}_${r.docket_loc}`,
      docket_no: String(r.docket_no || '').trim(),
      docket_date: r.docket_date,
      loc_code: r.docket_loc,
      docket_to_loc: r.docket_to_loc,
      docket_from_town: r.docket_from_town,
      docket_to_town: r.docket_to_town,
      docket_pay_type: r.docket_pay_type,
      party_name: r.party_name,
      bill_amt: bill.toFixed(2),
      net_received: bill.toFixed(2),
      received_amt: bill.toFixed(2),
      tds_amt: '0.00',
      deduction_amt: '0.00',
    };
  });
}

async function getDetails(mrNo, mrDate, loc, trx = db) {
  const no = normalizeMrNo(mrNo, loc) || String(mrNo || '').trim();
  return trx('sss.sst_mr_dtl as r')
    .leftJoin('sss.sst_docket as d', function () {
      this.on(trx.raw("UPPER(TRIM(COALESCE(r.docket_no, '')::text)) = UPPER(TRIM(d.docket_no::text))"))
        .andOn(trx.raw("UPPER(TRIM(COALESCE(r.docket_loc, '')::text)) = UPPER(TRIM(d.docket_loc::text))"));
    })
    .select(
      'r.*',
      'd.docket_to_loc',
      'd.docket_pickup_town as docket_from_town',
      'd.docket_dly_town as docket_to_town',
      'd.docket_pay_type'
    )
    .whereRaw('UPPER(TRIM(r.loc_code::text)) = UPPER(TRIM(?))', [loc])
    .andWhereRaw('UPPER(TRIM(r.mr_no::text)) = UPPER(TRIM(?))', [no])
    .andWhereRaw('CAST(r.mr_date AS DATE) = CAST(? AS DATE)', [toDate(mrDate) || mrDate])
    .orderBy('r.sr_no');
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
  const mrReason = parseInt(header.mr_reason, 10);
  if (![1, 2, 3, 4].includes(mrReason)) throw new Error('Please select MR Reason');

  const needsDetails = mrReason === 1 || mrReason === 2;
  const lines = (Array.isArray(details) ? details : []).filter((d) => n(d.received_amt) > 0 || n(d.tds_amt) > 0 || n(d.deduction_amt) > 0);
  if (needsDetails && !lines.length) throw new Error('Select at least one docket and enter received amount');
  if (!needsDetails && n(header.received_amt) <= 0) throw new Error('Enter received amount');
  if (mrReason === 1) {
    const partial = lines.find((d) => {
      const gross = n(d.bill_amt) + n(d.sgst_amt) + n(d.cgst_amt) + n(d.igst_amt);
      return Math.abs(n(d.received_amt) + n(d.tds_amt) + n(d.deduction_amt) - gross) > 0.009;
    });
    if (partial) {
      throw new Error(`Paid booking must clear docket ${partial.docket_no} in full including GST`);
    }
  }

  const trx = await db.transaction();
  try {
    let mrNo = normalizeMrNo(header.mr_no, loc);
    if (!mrNo) mrNo = await getNextMrNo(loc, trx);

    const existing = await trx('sss.sst_mr_hdr')
      .where({ loc_code: loc })
      .andWhereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [mrNo])
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [toDate(header.mr_date)])
      .first();

    const recSum = needsDetails ? lines.reduce((s, d) => s + n(d.received_amt), 0) : n(header.received_amt);
    const tdsSum = needsDetails ? lines.reduce((s, d) => s + n(d.tds_amt), 0) : n(header.tds_amt);
    const dedSum = needsDetails ? lines.reduce((s, d) => s + n(d.deduction_amt), 0) : n(header.deduction_amt);

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
      mr_reason: mrReason,
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
      invoice_no: n(d.invoice_no) || 0,
      invoice_date: toDate(d.invoice_date),
      invoice_loc: d.invoice_loc || loc,
      docket_no: d.docket_no || null,
      docket_date: toDate(d.docket_date),
      docket_loc: d.docket_loc || d.loc_code || loc,
      bill_amt: n(d.bill_amt),
      sgst_amt: n(d.sgst_amt),
      cgst_amt: n(d.cgst_amt),
      igst_amt: n(d.igst_amt),
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
  getOutstandingDockets,
  getByNumber,
  saveReceipt,
  deleteReceipt,
};
