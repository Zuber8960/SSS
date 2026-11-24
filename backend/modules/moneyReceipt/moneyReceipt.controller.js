const db = require('../../config/db');

const n = (v) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};

const toDate = (v) => {
  if (!v) return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, '0');
    const d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(v).trim();
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
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

const BILL_LOC = 'GGRN';
const DEFAULT_SAC = '996511';
const CHARGE_COL = {
  DK01: 'freight',
  DK02: 'fuel_surcharge',
  DK03: 'fov',
  DK04: 'factory_charge',
  DK05: 'door_collection',
  DK06: 'handling',
  DK07: 'oda_charge',
  DK08: 'door_delivery',
  DK09: 'stationery',
};

const round2 = (v) => Math.round(n(v) * 100) / 100;

const gstState = (gstin) => {
  const code = String(gstin || '').replace(/\s/g, '').toUpperCase().slice(0, 2);
  return /^[0-9]{2}$/.test(code) ? code : '';
};

const splitGst = (taxable, branchGstin, customerGstin) => {
  const base = round2(taxable);
  const gst = round2(base * 0.18);
  const branch = gstState(branchGstin);
  const customer = gstState(customerGstin);
  const inter = Boolean(branch && customer && branch !== customer);
  const cgst = inter ? 0 : round2(gst / 2);
  const sgst = inter ? 0 : round2(gst - cgst);
  const igst = inter ? gst : 0;
  return { taxable_amt: base, cgst, sgst, igst, total_amt: round2(base + gst) };
};

async function nextInvoiceNo(loc, trx) {
  const result = await trx.raw(
    `SELECT COALESCE(MAX(CAST(invoice_no AS INTEGER)), 0) + 1 AS next_no
     FROM sss.sst_invoice_hdr
     WHERE UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))`,
    [loc]
  );
  return result.rows?.[0]?.next_no || 1;
}

async function nextAdjNo(loc, trx) {
  const result = await trx.raw(
    `SELECT COALESCE(MAX(
       NULLIF(RIGHT(REGEXP_REPLACE(TRIM(adj_no::text), '[^0-9]', '', 'g'), 6), '')::INTEGER
     ), 0) + 1 AS next_no
     FROM sss.sst_bill_adj_hdr
     WHERE UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))`,
    [loc]
  );
  const seq = result.rows?.[0]?.next_no || 1;
  return `${locPrefix(loc)}BA${String(seq).padStart(6, '0')}`;
}

async function buildBillLines(trx, lines) {
  const nos = [...new Set(lines.map((d) => String(d.docket_no || '').trim()).filter(Boolean))];
  if (!nos.length) return [];
  const [charges, dockets] = await Promise.all([
    trx('sss.sst_docket_charges as dc')
      .whereIn('dc.docket_no', nos)
      .andWhere('dc.record_status', 0)
      .select('dc.docket_no', 'dc.charge_code', 'dc.charge_amt'),
    trx('sss.sst_docket as d')
      .leftJoin('sss.ssm_business_partner as cnee', function () {
        this.on(trx.raw('CAST(cnee.record_id AS TEXT) = CAST(d.cnee_id AS TEXT)'));
      })
      .whereIn('d.docket_no', nos)
      .andWhere('d.record_status', 0)
      .select(
        'd.docket_no', 'd.docket_loc', 'd.docket_date', 'd.docket_to_loc',
        'd.docket_pickup_town', 'd.docket_dly_town', 'd.docket_act_wt', 'd.docket_chrg_wt',
        'd.docket_rate', 'd.docket_rate_uom', 'cnee.bp_name as cnee_name'
      ),
  ]);
  return lines.map((line) => {
    const no = String(line.docket_no || '').trim().toUpperCase();
    const locCode = String(line.docket_loc || line.loc_code || '').trim().toUpperCase();
    const docket = dockets.find((d) =>
      String(d.docket_no || '').trim().toUpperCase() === no
      && (!locCode || String(d.docket_loc || '').trim().toUpperCase() === locCode)
    ) || dockets.find((d) => String(d.docket_no || '').trim().toUpperCase() === no);
    const own = charges.filter((c) => String(c.docket_no || '').trim().toUpperCase() === no);
    const amounts = {
      freight: 0, handling: 0, fuel_surcharge: 0, factory_charge: 0, oda_charge: 0,
      fov: 0, stationery: 0, door_collection: 0, door_delivery: 0,
    };
    own.forEach((c) => {
      const key = CHARGE_COL[String(c.charge_code || '').toUpperCase().trim()];
      if (key) amounts[key] += n(c.charge_amt);
    });
    if (!own.length) amounts.freight = n(line.bill_amt);
    return { line, docket, amounts, hasCharges: own.length > 0 };
  });
}

async function listBanks() {
  return db('sss.ssm_bank_master')
    .select('rec_id', 'bank_name')
    .where({ is_active: true })
    .orderBy('bank_name');
}

async function getOutstandingDockets({ loc_code, bp_code, bp_name, bp_id, mr_reason, mr_date }) {
  const loc = locOf(loc_code);
  const reason = parseInt(mr_reason, 10);
  const mrDate = toDate(mr_date);
  const code = String(bp_code ?? '').trim();
  const name = String(bp_name ?? '').trim();
  const bpId = String(bp_id ?? '').trim();
  if (!loc || !mrDate || (reason !== 1 && reason !== 2)) return [];

  const payType = reason === 1 ? 'PAID' : 'TO PAY';
  const partyIdCol = reason === 1 ? 'd.cnor_id' : 'd.cnee_id';
  // Paid matches the booking (origin) branch. To Pay matches the delivery (destination) branch.
  const locClause = reason === 1
    ? 'UPPER(TRIM(d.docket_loc::text)) = UPPER(TRIM(?))'
    : 'UPPER(TRIM(COALESCE(d.docket_to_loc, \'\')::text)) = UPPER(TRIM(?))';

  const params = [payType, loc, mrDate];

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
  const partyClause = !partyParts.length
    ? ''
    : `AND (${reason === 2 && partyParts.length > 1 ? partyParts.join(' AND ') : partyParts.join(' OR ')})`;

  const result = await db.raw(
    `SELECT
        d.docket_no::text AS docket_no,
        to_char(d.docket_date::date, 'YYYY-MM-DD') AS docket_date,
        d.docket_loc,
        d.docket_to_loc,
        d.docket_pickup_town AS docket_from_town,
        d.docket_dly_town AS docket_to_town,
        d.docket_pay_type,
        d.cnor_id,
        COALESCE(d.docket_tot_amt, 0) AS docket_tot_amt,
        bp.record_id::text AS party_id,
        bp.bp_grp_code AS party_code,
        bp.bp_name AS party_name
      FROM sss.sst_docket d
      LEFT JOIN sss.ssm_business_partner bp
        ON CAST(bp.record_id AS TEXT) = CAST(${partyIdCol} AS TEXT)
      WHERE COALESCE(d.record_status, 0) = 0
        AND UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = ?
        AND ${locClause}
        AND d.docket_date::date <= ?::date
        AND COALESCE(d.docket_tot_amt, 0) > 0.009
        AND NOT EXISTS (
          SELECT 1 FROM sss.sst_mr_dtl r
          WHERE UPPER(TRIM(COALESCE(r.docket_no, '')::text)) = UPPER(TRIM(d.docket_no::text))
            AND UPPER(TRIM(COALESCE(r.docket_loc, '')::text)) = UPPER(TRIM(d.docket_loc::text))
        )
        ${partyClause}
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
      cnor_id: r.cnor_id,
      party_id: r.party_id,
      party_code: r.party_code,
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
    .leftJoin('sss.ssm_business_partner as cnor', function () {
      this.on(trx.raw('CAST(cnor.record_id AS TEXT) = CAST(d.cnor_id AS TEXT)'));
    })
    .leftJoin('sss.ssm_business_partner as cnee', function () {
      this.on(trx.raw('CAST(cnee.record_id AS TEXT) = CAST(d.cnee_id AS TEXT)'));
    })
    .select(
      'r.*',
      'd.docket_to_loc',
      'd.docket_pickup_town as docket_from_town',
      'd.docket_dly_town as docket_to_town',
      'd.docket_pay_type',
      'd.cnor_id',
      trx.raw(`CASE WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = 'TO PAY' THEN cnee.record_id::text ELSE cnor.record_id::text END AS party_id`),
      trx.raw(`CASE WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = 'TO PAY' THEN cnee.bp_name ELSE cnor.bp_name END AS party_name`),
      trx.raw(`CASE WHEN UPPER(TRIM(COALESCE(d.docket_pay_type, ''))) = 'TO PAY' THEN cnee.bp_grp_code::text ELSE cnor.bp_grp_code::text END AS party_code`)
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

async function saveBranchBill(trx, { header, lines, company_code, userId, mrDate, priorBill }) {
  const invoiceDate = toDate(priorBill?.invoice_date) || toDate(mrDate) || toDate(header.mr_date);
  if (!invoiceDate) throw new Error('Bill date is required');
  let invoiceNo = n(priorBill?.invoice_no);
  const invoiceLoc = BILL_LOC;
  let existing = null;
  if (invoiceNo) {
    existing = await trx('sss.sst_invoice_hdr')
      .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
      .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate])
      .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [invoiceLoc])
      .first();
    if (existing?.inv_sub_date) throw new Error(`Bill ${invoiceNo} is already submitted and cannot be changed`);
    const cancelled = String(existing?.cancel_flag || '').trim().toUpperCase();
    if (['Y', 'C', '1'].includes(cancelled)) throw new Error(`Bill ${invoiceNo} is cancelled`);
  }
  if (!invoiceNo) invoiceNo = await nextInvoiceNo(invoiceLoc, trx);

  const [ggrn, partner] = await Promise.all([
    trx('sss.ssm_location').whereRaw(`UPPER(TRIM(loc_code::text)) = 'GGRN'`).first(),
    n(header.bp_code)
      ? trx('sss.ssm_business_partner').whereRaw('TRIM(CAST(bp_grp_code AS TEXT)) = TRIM(?)', [String(header.bp_code)]).first()
      : trx('sss.ssm_business_partner').whereRaw('LOWER(TRIM(bp_name)) = LOWER(TRIM(?))', [header.bp_name || '']).first(),
  ]);
  const locGstin = ggrn?.gstin_no || ggrn?.loc_gstin || null;
  const bpGstin = partner?.bp_gstin || null;
  const built = (await buildBillLines(trx, lines)).slice().sort((a, b) => {
    const ad = toDate(a.docket?.docket_date) || toDate(a.line?.docket_date) || '9999-99-99';
    const bd = toDate(b.docket?.docket_date) || toDate(b.line?.docket_date) || '9999-99-99';
    if (ad !== bd) return ad < bd ? -1 : 1;
    return String(a.line?.docket_no || '').localeCompare(String(b.line?.docket_no || ''), undefined, { numeric: true, sensitivity: 'base' });
  });
  const detailRows = built.map((row, index) => {
    const sum = Object.values(row.amounts).reduce((s, v) => s + n(v), 0);
    const gst = row.hasCharges
      ? splitGst(sum, locGstin, bpGstin)
      : {
          taxable_amt: round2(row.line.bill_amt),
          cgst: round2(row.line.cgst_amt),
          sgst: round2(row.line.sgst_amt),
          igst: round2(row.line.igst_amt),
          total_amt: round2(n(row.line.bill_amt) + n(row.line.cgst_amt) + n(row.line.sgst_amt) + n(row.line.igst_amt)),
        };
    const d = row.docket || {};
    return {
      company_code: company_code || null,
      division_code: header.division_code || null,
      invoice_loc: invoiceLoc,
      invoice_no: invoiceNo,
      invoice_date: invoiceDate,
      invoice_type: 'R',
      inv_sr_no: index + 1,
      docket_no: row.line.docket_no || null,
      docket_from_loc: d.docket_loc || row.line.docket_loc || row.line.loc_code || null,
      docket_to_loc: d.docket_to_loc || null,
      docket_from_town: d.docket_pickup_town || null,
      docket_to_town: d.docket_dly_town || null,
      docket_date: toDate(d.docket_date) || toDate(row.line.docket_date),
      docket_chrwt: n(d.docket_chrg_wt),
      docket_actwt: n(d.docket_act_wt),
      consignee: d.cnee_name || null,
      docket_rate: d.docket_rate == null ? null : n(d.docket_rate),
      docket_rate_uom: d.docket_rate_uom || null,
      ...row.amounts,
      ...gst,
      pod_flag: null,
      created_by: userId || null,
      created_on: new Date(),
    };
  });
  const total = round2(detailRows.reduce((s, d) => s + n(d.total_amt), 0));
  const billHdr = {
    company_code: company_code || null,
    tenant_id: company_code || null,
    division_code: header.division_code || null,
    loc_code: invoiceLoc,
    bp_code: n(header.bp_code) || 0,
    bp_name: header.bp_name || null,
    invoice_type: 'R',
    invoice_no: invoiceNo,
    invoice_date: invoiceDate,
    loc_gstin: locGstin,
    bp_gstin: bpGstin,
    sac_code: DEFAULT_SAC,
    total_inv_amt: total,
    modified_by: userId || null,
    modified_on: new Date(),
  };
  let savedHeader;
  if (existing) {
    [savedHeader] = await trx('sss.sst_invoice_hdr')
      .where({ record_id: existing.record_id })
      .update(billHdr)
      .returning('*');
  } else {
    billHdr.created_by = userId || null;
    billHdr.created_on = new Date();
    [savedHeader] = await trx('sss.sst_invoice_hdr').insert(billHdr).returning('*');
  }
  await trx('sss.sst_invoice_dtl')
    .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [invoiceNo])
    .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [invoiceDate])
    .andWhereRaw('UPPER(TRIM(invoice_loc::text)) = UPPER(TRIM(?))', [invoiceLoc])
    .del();
  if (detailRows.length) await trx('sss.sst_invoice_dtl').insert(detailRows);
  return {
    invoice: {
      invoice_no: savedHeader.invoice_no,
      invoice_date: invoiceDate,
      invoice_loc: invoiceLoc,
      total_inv_amt: total,
    },
  };
}

async function saveReceiptAdjustment(trx, { loc, saved, invoice, header, company_code, userId, received }) {
  const billAmt = round2(invoice.total_inv_amt);
  const mrAmt = round2(received);
  const adjAmt = round2(Math.min(mrAmt, billAmt));
  const link = await trx('sss.sst_bill_adj_dtl')
    .whereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [saved.mr_no])
    .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [saved.mr_date])
    .andWhereRaw('UPPER(TRIM(COALESCE(mr_loc, \'\'))) = UPPER(TRIM(?))', [loc])
    .first();
  let adjHeader = null;
  if (link) {
    adjHeader = await trx('sss.sst_bill_adj_hdr')
      .whereRaw('UPPER(TRIM(adj_no::text)) = UPPER(TRIM(?))', [link.adj_no])
      .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [link.adj_date])
      .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [link.loc_code])
      .first();
  }
  if (adjHeader && String(adjHeader.loc_code || '').trim().toUpperCase() !== BILL_LOC) {
    await trx('sss.sst_bill_adj_dtl')
      .where({ loc_code: adjHeader.loc_code, adj_no: adjHeader.adj_no })
      .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [adjHeader.adj_date])
      .del();
    await trx('sss.sst_bill_adj_hdr').where({ record_id: adjHeader.record_id }).del();
    adjHeader = null;
  }
  const adjNo = adjHeader?.adj_no || await nextAdjNo(BILL_LOC, trx);
  const adjDate = toDate(adjHeader?.adj_date) || toDate(saved.mr_date);
  const hdr = {
    company_code: company_code || null,
    tenant_id: company_code || null,
    division_code: header.division_code || null,
    loc_code: BILL_LOC,
    adj_no: adjNo,
    adj_date: adjDate,
    bp_code: n(header.bp_code) || 0,
    bp_name: header.bp_name || null,
    adj_amt: adjAmt,
    remarks: header.remarks || `Receipt ${saved.mr_no}`,
    modified_by: userId || null,
    modified_on: new Date(),
  };
  let savedAdj;
  if (adjHeader) {
    [savedAdj] = await trx('sss.sst_bill_adj_hdr')
      .where({ record_id: adjHeader.record_id })
      .update(hdr)
      .returning('*');
    await trx('sss.sst_bill_adj_dtl')
      .where({ loc_code: adjHeader.loc_code, adj_no: adjHeader.adj_no })
      .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [adjHeader.adj_date])
      .del();
  } else {
    hdr.created_by = userId || null;
    hdr.created_on = new Date();
    [savedAdj] = await trx('sss.sst_bill_adj_hdr').insert(hdr).returning('*');
  }
  const detail = {
    company_code: company_code || null,
    loc_code: BILL_LOC,
    adj_no: savedAdj.adj_no,
    adj_date: savedAdj.adj_date,
    sr_no: 1,
    mr_no: saved.mr_no,
    mr_date: toDate(saved.mr_date),
    mr_loc: loc,
    invoice_no: String(invoice.invoice_no),
    invoice_date: toDate(invoice.invoice_date),
    invoice_loc: BILL_LOC,
    mr_amt: mrAmt,
    bill_amt: billAmt,
    adj_amt: adjAmt,
    created_by: userId || null,
    created_on: new Date(),
  };
  await trx('sss.sst_bill_adj_dtl').insert(detail);
  return { header: savedAdj, detail };
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
  if (needsDetails && lines.length > 1) {
    const nos = [...new Set(lines.map((d) => String(d.docket_no || '').trim()).filter(Boolean))];
    const found = await db('sss.sst_docket')
      .where('record_status', 0)
      .whereIn('docket_no', nos)
      .select('docket_no', 'docket_loc', 'cnor_id');
    const consignors = new Set(lines.map((line) => {
      const hit = found.find((d) =>
        String(d.docket_no || '').trim().toUpperCase() === String(line.docket_no || '').trim().toUpperCase()
        && String(d.docket_loc || '').trim().toUpperCase() === String(line.docket_loc || loc).trim().toUpperCase()
      );
      return String(hit?.cnor_id ?? '');
    }));
    if (consignors.size > 1) {
      throw new Error('Dockets of different consignors cannot be selected together');
    }
  }
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

    let priorBill = null;
    if (existing) {
      priorBill = await trx('sss.sst_mr_dtl')
        .where({ loc_code: loc, mr_no: existing.mr_no })
        .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date])
        .whereRaw('COALESCE(invoice_no, 0) <> 0')
        .first();
    }

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

    let invoice = null;
    let adjustment = null;
    if (needsDetails) {
      const made = await saveBranchBill(trx, {
        header,
        lines,
        company_code: hdr.company_code,
        userId,
        mrDate: saved.mr_date,
        priorBill,
      });
      invoice = made.invoice;
      const detailRows = lines.map((d, i) => ({
        company_code: hdr.company_code,
        loc_code: loc,
        mr_no: saved.mr_no,
        mr_date: saved.mr_date,
        sr_no: i + 1,
        invoice_no: invoice.invoice_no,
        invoice_date: invoice.invoice_date,
        invoice_loc: BILL_LOC,
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
      adjustment = await saveReceiptAdjustment(trx, {
        loc,
        saved,
        invoice,
        header,
        company_code: hdr.company_code,
        userId,
        received: hdr.received_amt,
      });
    } else {
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
    }

    await trx.commit();
    const detailsOut = await getDetails(saved.mr_no, saved.mr_date, saved.loc_code);
    return { header: saved, details: detailsOut, invoice, adjustment };
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
    const details = await trx('sss.sst_mr_dtl')
      .where({ loc_code: loc, mr_no: existing.mr_no })
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date]);
    const bill = details.find((d) => n(d.invoice_no));
    const links = await trx('sss.sst_bill_adj_dtl')
      .whereRaw('UPPER(TRIM(mr_no::text)) = UPPER(TRIM(?))', [existing.mr_no])
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date])
      .andWhereRaw('UPPER(TRIM(COALESCE(mr_loc, \'\'))) = UPPER(TRIM(?))', [loc]);
    for (const link of links) {
      await trx('sss.sst_bill_adj_dtl').where({ record_id: link.record_id }).del();
      const left = await trx('sss.sst_bill_adj_dtl')
        .whereRaw('UPPER(TRIM(adj_no::text)) = UPPER(TRIM(?))', [link.adj_no])
        .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [link.adj_date])
        .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [link.loc_code])
        .first();
      if (!left) {
        await trx('sss.sst_bill_adj_hdr')
          .whereRaw('UPPER(TRIM(adj_no::text)) = UPPER(TRIM(?))', [link.adj_no])
          .andWhereRaw('CAST(adj_date AS DATE) = CAST(? AS DATE)', [link.adj_date])
          .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [link.loc_code])
          .del();
      }
    }
    await trx('sss.sst_mr_dtl')
      .where({ loc_code: loc, mr_no: existing.mr_no })
      .andWhereRaw('CAST(mr_date AS DATE) = CAST(? AS DATE)', [existing.mr_date])
      .del();
    if (bill) {
      const stillUsed = await trx('sss.sst_mr_dtl')
        .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [bill.invoice_no])
        .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [bill.invoice_date])
        .andWhereRaw('UPPER(TRIM(invoice_loc::text)) = UPPER(TRIM(?))', [bill.invoice_loc || BILL_LOC])
        .first();
      const inv = await trx('sss.sst_invoice_hdr')
        .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [bill.invoice_no])
        .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [bill.invoice_date])
        .andWhereRaw('UPPER(TRIM(loc_code::text)) = UPPER(TRIM(?))', [bill.invoice_loc || BILL_LOC])
        .first();
      if (!stillUsed && inv && !inv.inv_sub_date) {
        await trx('sss.sst_invoice_dtl')
          .whereRaw('CAST(invoice_no AS INTEGER) = CAST(? AS INTEGER)', [bill.invoice_no])
          .andWhereRaw('CAST(invoice_date AS DATE) = CAST(? AS DATE)', [bill.invoice_date])
          .andWhereRaw('UPPER(TRIM(invoice_loc::text)) = UPPER(TRIM(?))', [bill.invoice_loc || BILL_LOC])
          .del();
        await trx('sss.sst_invoice_hdr').where({ record_id: inv.record_id }).del();
      }
    }
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
