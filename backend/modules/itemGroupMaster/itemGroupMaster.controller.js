const db = require('../../config/db');

const TABLE = 'sss.ssm_item_group';

const mapRow = (row) => {
  if (!row) return row;
  return {
    rec_id: row.record_id,
    record_id: row.record_id,
    company_code: row.company_code,
    division_code: row.division_code,
    item_group_code: row.item_group_code,
    item_group_desc: row.item_group_desc,
    item_group_category: row.item_group_category || '',
  };
};

module.exports = {
  async getAll() {
    const rows = await db(TABLE)
      .select(
        'record_id',
        'company_code',
        'division_code',
        'item_group_code',
        'item_group_desc',
        'item_group_category'
      )
      .orderBy('item_group_code', 'asc');
    return rows.map(mapRow);
  },

  async getNextCode() {
    const row = await db(TABLE)
      .select(db.raw("COALESCE(MAX(NULLIF(regexp_replace(item_group_code, '[^0-9]', '', 'g'), '')::numeric), 0) as max_code"))
      .first();
    return String(Number(row?.max_code || 0) + 1);
  },

  async save(recId, payload, company_code, division_code) {
    const record = {
      company_code: payload.company_code || company_code || '1',
      division_code: payload.division_code || division_code || '1',
      item_group_code: String(payload.item_group_code || '').trim().toUpperCase(),
      item_group_desc: String(payload.item_group_desc || '').trim().toUpperCase(),
      item_group_category: String(payload.item_group_category || '').trim().toUpperCase() || null,
      record_created_by: recId,
      record_created_on: new Date(),
    };
    const rows = await db(TABLE).insert(record).returning('*');
    return rows.map(mapRow);
  },

  async update(rec_id, payload) {
    const updates = {
      item_group_desc: String(payload.item_group_desc || '').trim().toUpperCase(),
      item_group_category: String(payload.item_group_category || '').trim().toUpperCase() || null,
      record_updated_by: payload.aud_user || null,
      record_updated_on: new Date(),
    };
    const rows = await db(TABLE).where({ record_id: rec_id }).update(updates).returning('*');
    return rows.map(mapRow);
  },

  async remove(rec_id) {
    return db(TABLE).where({ record_id: rec_id }).del();
  },
};
