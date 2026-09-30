const db = require('../../config/db');

const TABLE = 'sss.ssm_item_hdr';
const GROUP_TABLE = 'sss.ssm_item_group';

const toDate = (v) => {
  if (!v) return null;
  const s = String(v).slice(0, 10);
  return s || null;
};

const mapRow = (row) => {
  if (!row) return row;
  return {
    rec_id: row.record_id,
    record_id: row.record_id,
    company_code: row.company_code,
    division_code: row.division_code,
    item_code: row.item_code,
    item_desc: row.item_desc,
    item_group_code: row.item_group_code,
    item_group_desc: row.item_group_desc || '',
    item_category: row.item_category || '',
    account_code: row.account_code || '',
    status: row.status || 'VL',
    expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : '',
    rate: row.rate ?? '',
    item_group_category: row.item_group_category || '',
    labor: row.labor ?? '',
    gst_rate: row.gst_rate === null || row.gst_rate === undefined ? '' : String(row.gst_rate),
    battery_flag: row.battery_flag || 'N',
    sac_hsn_flag: row.sac_hsn_flag || '',
  };
};

module.exports = {
  async getAll({ item_group_code, search, searchBy } = {}) {
    const query = db(`${TABLE} as i`)
      .leftJoin(`${GROUP_TABLE} as g`, 'i.item_group_code', 'g.item_group_code')
      .select(
        'i.record_id',
        'i.company_code',
        'i.division_code',
        'i.item_code',
        'i.item_desc',
        'i.item_group_code',
        'g.item_group_desc',
        'i.item_category',
        'i.account_code',
        'i.status',
        'i.expiry_date',
        'i.rate',
        'i.item_group_category',
        'i.labor',
        'i.gst_rate',
        'i.battery_flag',
        'i.sac_hsn_flag'
      )
      .whereNot('i.item_group_code', '7777')
      .orderBy('i.item_code', 'asc');

    if (item_group_code) query.andWhere('i.item_group_code', item_group_code);
    if (search) {
      if (searchBy === 'NAME') {
        query.andWhere('i.item_desc', 'ilike', `%${search}%`);
      } else {
        query.andWhere('i.item_code', 'ilike', `${search}%`);
      }
    }
    const rows = await query;
    return rows.map(mapRow);
  },

  async getNextCode() {
    const row = await db(TABLE)
      .whereNot('item_group_code', '7777')
      .select(db.raw("COALESCE(MAX(NULLIF(regexp_replace(item_code, '[^0-9]', '', 'g'), '')::numeric), 0) as max_code"))
      .first();
    return String(Number(row?.max_code || 0) + 1);
  },

  async save(recId, payload, company_code, division_code) {
    const labor = payload.labor === '' || payload.labor == null ? null : Number(payload.labor);
    if (labor != null && Number.isFinite(labor) && labor > 3000) {
      const err = new Error('Labour Charge can not be greater than 3000/-');
      err.status = 400;
      throw err;
    }
    const record = {
      company_code: payload.company_code || company_code || '1',
      division_code: payload.division_code || division_code || '1',
      item_code: String(payload.item_code || '').trim().toUpperCase(),
      item_desc: String(payload.item_desc || '').trim().toUpperCase(),
      item_group_code: String(payload.item_group_code || '').trim().toUpperCase(),
      item_category: String(payload.item_category || '').trim().toUpperCase() || null,
      account_code: String(payload.account_code || '').trim().toUpperCase() || null,
      status: payload.status || 'VL',
      expiry_date: toDate(payload.expiry_date),
      rate: payload.rate === '' || payload.rate == null ? null : Number(payload.rate),
      item_group_category: String(payload.item_group_category || '').trim().toUpperCase() || null,
      labor,
      gst_rate: payload.gst_rate === '' || payload.gst_rate == null ? null : Number(payload.gst_rate),
      battery_flag: payload.battery_flag || 'N',
      sac_hsn_flag: String(payload.sac_hsn_flag || '').trim().toUpperCase() || null,
      record_created_by: recId,
      record_created_on: new Date(),
    };
    const rows = await db(TABLE).insert(record).returning('*');
    return this.getAll({ search: record.item_code, searchBy: 'CODE' }).then((list) =>
      list.filter((r) => r.item_code === record.item_code)
    ).then((list) => (list.length ? list : rows.map(mapRow)));
  },

  async update(rec_id, payload) {
    const labor = payload.labor === '' || payload.labor == null ? null : Number(payload.labor);
    if (labor != null && Number.isFinite(labor) && labor > 3000) {
      const err = new Error('Labour Charge can not be greater than 3000/-');
      err.status = 400;
      throw err;
    }
    const updates = {
      item_desc: String(payload.item_desc || '').trim().toUpperCase(),
      item_group_code: String(payload.item_group_code || '').trim().toUpperCase(),
      item_category: String(payload.item_category || '').trim().toUpperCase() || null,
      account_code: String(payload.account_code || '').trim().toUpperCase() || null,
      status: payload.status || 'VL',
      expiry_date: toDate(payload.expiry_date),
      rate: payload.rate === '' || payload.rate == null ? null : Number(payload.rate),
      item_group_category: String(payload.item_group_category || '').trim().toUpperCase() || null,
      labor,
      gst_rate: payload.gst_rate === '' || payload.gst_rate == null ? null : Number(payload.gst_rate),
      battery_flag: payload.battery_flag || 'N',
      sac_hsn_flag: String(payload.sac_hsn_flag || '').trim().toUpperCase() || null,
      record_updated_by: payload.aud_user || null,
      record_updated_on: new Date(),
    };
    const rows = await db(TABLE).where({ record_id: rec_id }).update(updates).returning('*');
    if (!rows.length) return [];
    const list = await this.getAll();
    return list.filter((r) => String(r.rec_id) === String(rec_id));
  },

  async remove(rec_id) {
    return db(TABLE).where({ record_id: rec_id }).del();
  },
};
