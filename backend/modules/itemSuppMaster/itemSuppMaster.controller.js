const db = require('../../config/db');

const toDate = (v) => (v ? String(v).slice(0, 10) : null);

const mapRow = (row) => ({
  rec_id: row.record_id,
  record_id: row.record_id,
  item_code: row.item_code,
  supp_code: row.supp_code || '',
  supplier_name: row.supplier_name || '',
  item_uom: row.item_uom || '',
  item_weight: row.item_weight || '',
  item_pack_type: row.item_pack_type || '',
  item_pack_qty: row.item_pack_qty || '',
  item_amt: row.item_amt ?? 0,
  valid_to: toDate(row.valid_to) || '',
  status: row.status || 'VL',
  row_type: 'O',
});

module.exports = {
  async listSuppliers(loc_code) {
    const query = db('sss.ssm_business_partner')
      .select('bp_grp_code', 'bp_name', 'loc_code', 'record_id')
      .whereNotNull('bp_grp_code')
      .where('bp_grp_code', '<>', '')
      .orderBy('bp_name');
    if (loc_code) query.andWhere({ loc_code });
    let rows = await query;
    if (loc_code && rows.length === 0) {
      rows = await db('sss.ssm_business_partner')
        .select('bp_grp_code', 'bp_name', 'loc_code', 'record_id')
        .whereNotNull('bp_grp_code')
        .where('bp_grp_code', '<>', '')
        .orderBy('bp_name');
    }
    const seen = new Set();
    return rows
      .filter((r) => {
        const code = String(r.bp_grp_code).trim();
        if (seen.has(code)) return false;
        seen.add(code);
        return true;
      })
      .map((r) => ({
        supp_code: String(r.bp_grp_code).trim(),
        supplier_name: r.bp_name || '',
        label: `${String(r.bp_grp_code).trim()} > ${r.bp_name || ''}`,
      }));
  },

  async listByItem(item_code) {
    const rows = await db('sss.ssm_item_dtl as d')
      .leftJoin('sss.ssm_business_partner as bp', 'd.supp_code', 'bp.bp_grp_code')
      .where('d.item_code', item_code)
      .select(
        'd.*',
        'bp.bp_name as supplier_name'
      )
      .orderBy('d.record_id', 'asc');
    return rows.map(mapRow);
  },

  async save(item_code, rows, loc_code, userName) {
    if (!item_code) {
      const err = new Error('Please select Item Code');
      err.status = 400;
      throw err;
    }
    const selected = (rows || []).filter((r) => r.supp_code);
    if (!selected.length) {
      const err = new Error('Please select at least one supplier row');
      err.status = 400;
      throw err;
    }

    const trx = await db.transaction();
    try {
      let saved = 0;
      for (const row of selected) {
        const payload = {
          item_code,
          supp_code: String(row.supp_code).trim(),
          item_uom: String(row.item_uom || '').trim().toUpperCase() || null,
          item_weight: String(row.item_weight || '').trim() || null,
          item_pack_type: String(row.item_pack_type || '').trim().toUpperCase() || null,
          item_pack_qty: String(row.item_pack_qty || '').trim() || null,
          item_amt: row.item_amt === '' || row.item_amt == null ? null : Number(row.item_amt),
          valid_to: toDate(row.valid_to),
          status: row.status || 'VL',
          loc_code: loc_code || null,
        };

        if (row.rec_id || row.row_type === 'O') {
          const q = trx('sss.ssm_item_dtl').where({ item_code, supp_code: payload.supp_code });
          if (row.rec_id) q.where({ record_id: row.rec_id });
          const updated = await q.update({
            ...payload,
            record_updated_by: userName || null,
            record_updated_on: new Date(),
          });
          if (!updated) {
            await trx('sss.ssm_item_dtl').insert({
              ...payload,
              record_created_by: userName || null,
              record_created_on: new Date(),
            });
          }
        } else {
          const existing = await trx('sss.ssm_item_dtl')
            .where({ item_code, supp_code: payload.supp_code })
            .first();
          if (existing) {
            await trx('sss.ssm_item_dtl')
              .where({ record_id: existing.record_id })
              .update({
                ...payload,
                record_updated_by: userName || null,
                record_updated_on: new Date(),
              });
          } else {
            await trx('sss.ssm_item_dtl').insert({
              ...payload,
              record_created_by: userName || null,
              record_created_on: new Date(),
            });
          }
        }
        saved += 1;
      }
      await trx.commit();
      const data = await this.listByItem(item_code);
      return { saved, data };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  },
};
