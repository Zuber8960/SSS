const db = require('../../config/db');

const normalizeDate = (value) => {
  if (value === undefined || value === null || value === '') return null;
  return value;
};

const sanitizeDeliveryNote = (payload = {}) => ({
  ...payload,
  company_code: payload.company_code ?? null,
  division_code: payload.division_code ?? null,
  dly_note_no: payload.dly_note_no ?? null,
  dly_date: normalizeDate(payload.dly_date),
  docket_no: payload.docket_no ?? null,
  docket_date: normalizeDate(payload.docket_date),
  docket_from_loc: payload.docket_from_loc ?? null,
  docket_from_town: payload.docket_from_town ?? null,
  docket_to_loc: payload.docket_to_loc ?? null,
  docket_to_town: payload.docket_to_town ?? null,
  delivery_status: payload.delivery_status ?? null,
  delivery_remarks: payload.delivery_remarks ?? null,
  received_by: payload.received_by ?? null,
  pod_url: payload.pod_url ?? null,
  record_updated_by: payload.record_updated_by ?? null,
  record_updated_on: payload.record_updated_on ?? null,
});

module.exports = {
  async getAllDeliveryNotes(filters = {}) {
    const query = db('sss.sst_dly_note').select('*');

    if (filters.company_code) query.where({ company_code: filters.company_code });
    if (filters.division_code) query.andWhere({ division_code: filters.division_code });
    if (filters.dly_note_no) query.andWhere({ dly_note_no: filters.dly_note_no });
    if (filters.docket_no) query.andWhere({ docket_no: filters.docket_no });

    return query.orderBy('dly_date', 'desc').orderBy('record_id', 'desc');
  },

  async getDeliveryNoteByDlyNoteNo(dlyNoteNo, company_code) {
    const query = db('sss.sst_dly_note').where({ dly_note_no: dlyNoteNo });
    if (company_code) query.andWhere({ company_code });
    return query.first();
  },

  async getDeliveryNoteByDocketNo(docketNo, company_code) {
    const query = db('sss.sst_dly_note').where({ docket_no: docketNo });
    if (company_code) query.andWhere({ company_code });
    return query.orderBy('record_id', 'desc').first();
  },

  async saveDeliveryNote(payload) {
    const record = sanitizeDeliveryNote({
      ...payload,
      record_created_on: new Date(),
      record_updated_on: null,
    });

    const [inserted] = await db('sss.sst_dly_note').insert(record).returning('*');
    return inserted;
  },

  async updateDeliveryNote(dlyNoteNo, payload, company_code) {
    const updates = sanitizeDeliveryNote({
      ...payload,
      record_updated_on: new Date(),
    });

    delete updates.record_id;
    delete updates.record_created_on;

    const query = db('sss.sst_dly_note').where({ dly_note_no: dlyNoteNo });
    if (company_code) query.andWhere({ company_code });

    const [updated] = await query.update(updates).returning('*');
    return updated;
  },

  async deleteDeliveryNote(dlyNoteNo, company_code) {
    const query = db('sss.sst_dly_note').where({ dly_note_no: dlyNoteNo });
    if (company_code) query.andWhere({ company_code });
    return query.del();
  },
};
