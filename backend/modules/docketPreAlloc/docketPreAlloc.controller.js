const db = require('../../config/db');

const num = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function fail(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function formatDocketNo(loc_code, n) {
  return `${loc_code}CN${String(n).padStart(6, '0')}`;
}

async function peekAutoNos(loc_code, company_code, count) {
  const loc = String(loc_code || '').trim();
  if (!loc) throw fail(400, 'Location is required for auto numbering');
  const row = await db('sss.ssm_doc_control')
    .where({ doc_type: 'DKT', loc_code: loc })
    .modify((q) => {
      if (company_code) q.andWhere({ company_code });
    })
    .first();
  const start = Number(row?.last_upd_no || 0);
  return Array.from({ length: count }, (_, i) => formatDocketNo(loc, start + i + 1));
}

async function allocateAutoNos(trx, loc_code, company_code, count) {
  const loc = String(loc_code || '').trim();
  let q = trx('sss.ssm_doc_control').where({ doc_type: 'DKT', loc_code: loc });
  if (company_code) q = q.andWhere({ company_code });
  let row = await q.clone().forUpdate().first();
  if (!row) {
    const insert = { doc_type: 'DKT', loc_code: loc, last_upd_no: 0 };
    if (company_code) insert.company_code = company_code;
    await trx('sss.ssm_doc_control').insert(insert);
    row = await q.clone().forUpdate().first();
  }
  const start = Number(row.last_upd_no || 0);
  const nos = Array.from({ length: count }, (_, i) => formatDocketNo(loc, start + i + 1));
  await q.clone().update({ last_upd_no: start + count });
  return nos;
}

module.exports = {
  usedStatus(flag) {
    const v = String(flag || '').trim().toUpperCase();
    return v === 'Y' ? 'Y' : 'N';
  },

  async list({ used, loc_code, customer_code }) {
    const query = db('sss.sst_docket_preallc').select('*').orderBy('record_id', 'desc');
    const filter = String(used || 'ALL').toUpperCase();
    if (filter === 'Y' || filter === 'USED') {
      query.whereRaw("upper(coalesce(nullif(trim(used_flag), ''), 'N')) = 'Y'");
    } else if (filter === 'N' || filter === 'UNUSED') {
      query.whereRaw("upper(coalesce(nullif(trim(used_flag), ''), 'N')) = 'N'");
    }
    if (loc_code) query.andWhere('loc_code', loc_code);
    if (customer_code) query.andWhere('customer_code', customer_code);
    const rows = await query;
    return rows.map((r) => {
      const used_flag = this.usedStatus(r.used_flag);
      return {
        ...r,
        used_flag,
        used_label: used_flag === 'Y' ? 'USED' : 'UNUSED',
        stationery_label: r.stationery_type === 'A' ? 'Auto numbered' : 'Pre numbered',
      };
    });
  },

  async previewAuto({ loc_code, company_code, count }) {
    const n = Math.min(Math.max(num(count, 0), 0), 10);
    if (!n) return [];
    return peekAutoNos(loc_code, company_code, n);
  },

  async save(payload) {
    const stationery = String(payload.stationery_type || '').toUpperCase() === 'A' ? 'A' : 'P';
    const customer_code = String(payload.customer_code || '').trim();
    const customer_name = String(payload.customer_name || '').trim();
    const loc_code = String(payload.loc_code || '').trim();
    const company_code = payload.company_code || payload.tenant_id;
    const aud_user = payload.aud_user || '';
    let lines = Array.isArray(payload.lines) ? payload.lines : [];
    const requested = Math.min(Math.max(num(payload.no_of_dockets, lines.length), 0), 10);

    if (!customer_code) throw fail(400, 'Please select Customer');
    if (!requested) throw fail(400, 'Please enter Number of Dockets');
    lines = lines.slice(0, requested);

    if (stationery === 'P') {
      for (let i = 0; i < lines.length; i++) {
        if (!String(lines[i].docket_no || '').trim()) {
          throw fail(400, `Please enter Docket Number at row ${i + 1}`);
        }
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (!String(l.from_loc || '').trim()) throw fail(400, `Please select From Location at row ${i + 1}`);
      if (!String(l.from_town || '').trim()) throw fail(400, `Please select From Town at row ${i + 1}`);
      if (!String(l.to_loc || '').trim()) throw fail(400, `Please select To Location at row ${i + 1}`);
      if (!String(l.to_town || '').trim()) throw fail(400, `Please select To Town at row ${i + 1}`);
    }

    const trx = await db.transaction();
    try {
      let docketNos = lines.map((l) => String(l.docket_no || '').trim().toUpperCase());
      if (stationery === 'A') {
        docketNos = await allocateAutoNos(trx, loc_code, company_code, requested);
      }

      const seen = new Set();
      for (const no of docketNos) {
        if (seen.has(no)) throw fail(400, `Duplicate Docket Number ${no}`);
        seen.add(no);
      }

      const existingPre = await trx('sss.sst_docket_preallc').whereIn('docket_no', docketNos).select('docket_no');
      if (existingPre.length) {
        throw fail(400, `Docket Number ${existingPre[0].docket_no} is already pre-allocated`);
      }
      const existingDkt = await trx('sss.sst_docket').whereIn('docket_no', docketNos).select('docket_no').first();
      if (existingDkt) {
        throw fail(400, `Docket Number ${existingDkt.docket_no} already exists`);
      }

      const alloc_batch = `${loc_code || 'PRE'}${Date.now()}`;
      const rows = docketNos.map((docket_no, i) => ({
        alloc_batch,
        sr_no: i + 1,
        stationery_type: stationery,
        customer_code,
        customer_name,
        docket_no,
        from_loc: String(lines[i]?.from_loc || '').trim(),
        from_town: String(lines[i]?.from_town || '').trim(),
        to_loc: String(lines[i]?.to_loc || '').trim(),
        to_town: String(lines[i]?.to_town || '').trim(),
        no_of_dockets: requested,
        loc_code: loc_code || null,
        used_flag: 'N',
        aud_user,
        aud_date: trx.fn.now(),
      }));

      await trx('sss.sst_docket_preallc').insert(rows);
      await trx.commit();
      return { alloc_batch, count: rows.length, docket_nos: docketNos };
    } catch (err) {
      await trx.rollback();
      throw err;
    }
  },
};
