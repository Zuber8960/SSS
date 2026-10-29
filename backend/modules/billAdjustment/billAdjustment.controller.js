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

function formatAdjNo(loc, seq) {
  const num = Number.isFinite(parseInt(seq, 10)) && parseInt(seq, 10) > 0 ? parseInt(seq, 10) : 1;
  return `${locPrefix(loc)}BA${String(num).padStart(6, '0')}`;
}

function normalizeAdjNo(adjNo, loc) {
  const raw = String(adjNo ?? '').trim().toUpperCase();
  if (!raw || raw === 'AUTO') return null;
  const locP = locPrefix(loc);
  const prefixed = raw.match(/^([A-Z0-9]+)BA(\d+)$/);
  if (prefixed) return `${prefixed[1]}BA${String(parseInt(prefixed[2], 10)).padStart(6, '0')}`;
  const digits = raw.replace(/\D/g, '');
  if (digits && locP) return formatAdjNo(locP, parseInt(digits, 10));
  return raw;
}

async function getNextAdjNo(loc_code, trx = db) {
  const loc = locOf(loc_code);
  if (!loc) throw new Error('Branch is required');
  const result = await trx.raw(
    `SELECT COALESCE(MAX(
       NULLIF(RIGHT(REGEXP_REPLACE(TRIM(adj_no::text), '[^0-9]', '', 'g'), 6), '')::INTEGER
     ), 0) + 1 AS next_no
     FROM sss.sst_bill_adj_hdr
     WHERE UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))`,
    [loc]
  );
  return formatAdjNo(loc, result.rows?.[0]?.next_no || 1);
}

function partyParams({ bp_code, bp_name, bp_id }) {
  const code = String(bp_code ?? '').trim();
  const name = String(bp_name ?? '').trim();
  const bpId = String(bp_id ?? '').trim();
  const parts = [];
  const params = [];
  if (code && code !== '0') {
    parts.push(`TRIM(CAST(h.bp_code AS TEXT)) = TRIM(?)`);
    params.push(code);
  }
  if (bpId && bpId !== '0') {
    parts.push(`TRIM(CAST(h.bp_code AS TEXT)) = TRIM(?)`);
    params.push(bpId);
  }
  if (name) {
    parts.push(`LOWER(TRIM(COALESCE(h.bp_name, ''))) = LOWER(TRIM(?))`);
    params.push(name);
  }
  return { parts, params, code, name, bpId };
}

async function getOpenReceipts({ loc_code, bp_code, bp_name, bp_id }) {
  const loc = locOf(loc_code);
  const { parts, params, code, name, bpId } = partyParams({ bp_code, bp_name, bp_id });
  if (!loc || (!code && !name && !bpId) || !parts.length) return [];

  const result = await db.raw(
    `SELECT
        h.mr_no::text AS mr_no,
        to_char(h.mr_date::date, 'YYYY-MM-DD') AS mr_date,
        h.loc_code,
        h.pay_mode,
        h.mr_reason,
        h.bp_name,
        COALESCE(h.received_amt, 0) AS received_amt,
        COALESCE(h.received_amt, 0) - COALESCE(a.adj_amt, 0) AS balance_amt
      FROM sss.sst_mr_hdr h
      LEFT JOIN (
        SELECT
          UPPER(TRIM(mr_no::text)) AS mr_no,
          CAST(mr_date AS DATE) AS mr_date,
          UPPER(TRIM(COALESCE(mr_loc, '')::text)) AS mr_loc,
          SUM(COALESCE(adj_amt, 0)) AS adj_amt
        FROM sss.sst_bill_adj_dtl
        GROUP BY 1, 2, 3
      ) a
        ON a.mr_no = UPPER(TRIM(h.mr_no::text))
       AND a.mr_date = CAST(h.mr_date AS DATE)
       AND a.mr_loc = UPPER(TRIM(h.loc_code::text))
      WHERE COALESCE(h.mr_reason, 0) IN (3, 4)
        AND COALESCE(h.received_amt, 0) - COALESCE(a.adj_amt, 0) > 0.009
        AND (${parts.join(' OR ')})
      ORDER BY h.mr_date ASC, h.mr_no ASC`,
    params
  );

  return (result.rows || []).map((r) => ({
    id: `${r.mr_no}_${r.mr_date}_${r.loc_code}`,
    mr_no: r.mr_no,
    mr_date: r.mr_date,
    loc_code: r.loc_code,
    pay_mode: r.pay_mode,
    mr_reason: r.mr_reason,
    bp_name: r.bp_name,
    received_amt: n(r.received_amt).toFixed(2),
    balance_amt: n(r.balance_amt).toFixed(2),
  }));
}

async function getOpenBills({ loc_code, bp_code, bp_name, bp_id }) {
  const loc = locOf(loc_code);
  const { parts, params, code, name, bpId } = partyParams({ bp_code, bp_name, bp_id });
  if (!loc || (!code && !name && !bpId) || !parts.length) return [];

  const result = await db.raw(
    `SELECT
        h.invoice_no::text AS invoice_no,
        to_char(h.invoice_date::date, 'YYYY-MM-DD') AS invoice_date,
        h.loc_code,
        h.invoice_type,
        h.bp_name,
        COALESCE(h.total_inv_amt, 0) AS bill_amt,
        COALESCE(h.total_inv_amt, 0) - COALESCE(a.adj_amt, 0) AS balance_amt
      FROM sss.sst_invoice_hdr h
      LEFT JOIN (
        SELECT
          UPPER(TRIM(invoice_no::text)) AS invoice_no,
          CAST(invoice_date AS DATE) AS invoice_date,
          UPPER(TRIM(COALESCE(invoice_loc, '')::text)) AS invoice_loc,
          SUM(COALESCE(adj_amt, 0)) AS adj_amt
        FROM sss.sst_bill_adj_dtl
        GROUP BY 1, 2, 3
      ) a
        ON a.invoice_no = UPPER(TRIM(h.invoice_no::text))
       AND a.invoice_date = CAST(h.invoice_date AS DATE)
       AND a.invoice_loc = UPPER(TRIM(h.loc_code::text))
      WHERE COALESCE(UPPER(TRIM(h.cancel_flag::text)), '') NOT IN ('Y', 'C', '1', 'TRUE')
        AND COALESCE(h.total_inv_amt, 0) - COALESCE(a.adj_amt, 0) > 0.009
        AND (${parts.join(' OR ')})
      ORDER BY h.invoice_date ASC, h.invoice_no ASC`,
    params
  );

  return (result.rows || []).map((r) => ({
    id: `${r.invoice_no}_${r.invoice_date}_${r.loc_code}`,
    invoice_no: r.invoice_no,
    invoice_date: r.invoice_date,
    loc_code: r.loc_code,
    invoice_type: r.invoice_type,
    bp_name: r.bp_name,
    bill_amt: n(r.bill_amt).toFixed(2),
    balance_amt: n(r.balance_amt).toFixed(2),
  }));
}

async function saveAdjustment(payload = {}, company_code = null, userId = null) {
  const { header = {}, details = [] } = payload;
  const loc = locOf(header.loc_code);
  if (!loc) throw new Error('Branch is required');
  if (!header.adj_date) throw new Error('Adjustment date is required');
  if (!header.bp_name && !header.bp_code) throw new Error('Customer is required');
  const lines = (Array.isArray(details) ? details : []).filter((d) => n(d.adj_amt) > 0.009);
  if (!lines.length) throw new Error('Press Adjust to create allocation lines before save');

  const mrs = new Set(lines.map((d) => `${d.mr_no}|${d.mr_date}|${d.mr_loc || d.loc_code}`));
  const bills = new Set(lines.map((d) => `${d.invoice_no}|${d.invoice_date}|${d.invoice_loc || d.loc_code}`));
  if (mrs.size > 1 && bills.size > 1) {
    throw new Error('Many-to-many is not allowed. Use one receipt to many bills, or many receipts to one bill.');
  }

  const trx = await db.transaction();
  try {
    for (const d of lines) {
      const invoiceNo = String(d.invoice_no ?? '').trim();
      const invoiceDate = toDate(d.invoice_date);
      const invoiceLoc = locOf(d.invoice_loc || d.bill_loc || loc);
      if (!invoiceNo || !invoiceDate || !invoiceLoc) continue;
      const cancelled = await trx('sss.sst_invoice_hdr')
        .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
        .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate])
        .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [invoiceLoc])
        .whereRaw("COALESCE(UPPER(TRIM(cancel_flag::text)), '') IN ('Y', 'C', '1', 'TRUE')")
        .first();
      if (cancelled) {
        throw new Error(`Cancelled bill ${invoiceNo} cannot be adjusted`);
      }
    }

    let adjNo = normalizeAdjNo(header.adj_no, loc);
    if (!adjNo) adjNo = await getNextAdjNo(loc, trx);

    const existing = await trx('sss.sst_bill_adj_hdr')
      .where({ loc_code: loc })
      .andWhereRaw('UPPER(TRIM(adj_no::text)) = UPPER(TRIM(?))', [adjNo])
      .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [toDate(header.adj_date)])
      .first();

    const adjSum = Math.round(lines.reduce((s, d) => s + n(d.adj_amt), 0) * 100) / 100;
    const hdr = {
      company_code: company_code || header.company_code || null,
      tenant_id: company_code || header.tenant_id || null,
      division_code: header.division_code || null,
      loc_code: loc,
      adj_no: adjNo,
      adj_date: toDate(header.adj_date),
      bp_code: n(header.bp_code) || 0,
      bp_name: header.bp_name || null,
      adj_amt: adjSum,
      remarks: header.remarks || null,
      modified_by: userId || null,
      modified_on: new Date(),
    };

    let saved;
    if (existing) {
      [saved] = await trx('sss.sst_bill_adj_hdr')
        .where({ record_id: existing.record_id })
        .update(hdr)
        .returning('*');
      await trx('sss.sst_bill_adj_dtl')
        .where({ loc_code: loc, adj_no: existing.adj_no })
        .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [existing.adj_date])
        .del();
    } else {
      hdr.created_by = userId || null;
      hdr.created_on = new Date();
      [saved] = await trx('sss.sst_bill_adj_hdr').insert(hdr).returning('*');
    }

    const detailRows = lines.map((d, i) => ({
      company_code: hdr.company_code,
      loc_code: loc,
      adj_no: saved.adj_no,
      adj_date: saved.adj_date,
      sr_no: i + 1,
      mr_no: d.mr_no || null,
      mr_date: toDate(d.mr_date),
      mr_loc: d.mr_loc || d.loc_code || loc,
      invoice_no: d.invoice_no != null ? String(d.invoice_no) : null,
      invoice_date: toDate(d.invoice_date),
      invoice_loc: d.invoice_loc || d.bill_loc || loc,
      mr_amt: n(d.mr_amt || d.received_amt || d.mr_balance),
      bill_amt: n(d.bill_amt || d.bill_balance),
      adj_amt: n(d.adj_amt),
      created_by: userId || null,
      created_on: new Date(),
    }));
    if (detailRows.length) await trx('sss.sst_bill_adj_dtl').insert(detailRows);
    await trx.commit();
    return { header: saved, details: detailRows };
  } catch (e) {
    await trx.rollback();
    throw e;
  }
}

module.exports = {
  getOpenReceipts,
  getOpenBills,
  saveAdjustment,
};
