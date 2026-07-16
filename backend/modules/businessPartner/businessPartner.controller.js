const db = require('../../config/db');

module.exports = {

    async getAllBusinessPartnerData(tenant_id) {
        return db('sss.ssm_business_partner as bp')
            .leftJoin('sss.ssm_business_partner_type as bpt', 'bp.bp_type', 'bpt.rec_id')
            .select('bp.*', 'bpt.rec_name as bp_type_name')
            .where({ tenant_id });
    },

    async getBusinessPartnerDataByRecId(recId) {
        return db('sss.ssm_business_partner as bp')
            .leftJoin('sss.ssm_business_partner_type as bpt', 'bp.bp_type', 'bpt.rec_id')
            .select('bp.*', 'bpt.rec_name as bp_type_name')
            .where('bp.record_id', recId)
            .first();
    },

    async saveBusinessPartnerData(userId, payload) {
        delete payload.record_id;
        delete payload.company_code;
        const DATE_FIELDS = ['bp_closed_on', 'bp_ind_doc_1_from', 'bp_ind_doc_1_to', 'bp_ind_doc_2_from', 'bp_ind_doc_2_to'];
        for (const field of DATE_FIELDS) {
            if (field in payload && (payload[field] === '' || payload[field] === undefined)) {
                payload[field] = null;
            }
        }
        const record = { ...payload, record_created_by: userId, record_created_on: new Date() };
        return db('sss.ssm_business_partner').insert(record).returning('*');
    },

    async updateBusinessPartnerData({ recId, tenant_id }, payload) {
        delete payload.record_id;
        delete payload.company_code;
        const DATE_FIELDS = ['bp_closed_on', 'bp_ind_doc_1_from', 'bp_ind_doc_1_to', 'bp_ind_doc_2_from', 'bp_ind_doc_2_to'];
        for (const field of DATE_FIELDS) {
            if (field in payload && (payload[field] === '' || payload[field] === undefined)) {
                payload[field] = null;
            }
        }
        const updates = { ...payload, record_updated_on: new Date() };
        return db('sss.ssm_business_partner').where({ record_id: recId, tenant_id }).update(updates).returning('*');
    },

    async deleteBusinessPartnerData(recId) {
        return db('sss.ssm_business_partner').where({ record_id: recId }).del();
    },

    async getAllBpTypes() {
        return db('sss.ssm_business_partner_type')
            .select('rec_id', 'rec_name')
            .where({ is_active: true })
            .orderBy('rec_name');
    },

    async getBusinessPartnerByPanName(panName, tenant_id) {
        return db('sss.ssm_business_partner')
            .select('bp_name', 'bp_addres', 'bp_pincode', 'bp_gstin')
            .whereRaw('LOWER(bp_pan_name) = LOWER(?)', [panName])
            .where({ tenant_id })
            .first();
    },

    async getBusinessPartnerByBpName(bpName, locCode, tenant_id) {
        const query = db('sss.ssm_business_partner')
            .select('bp_name', 'bp_addres', 'bp_pincode', 'bp_gstin')
            .whereRaw('LOWER(bp_name) LIKE LOWER(?)', [`%${bpName}%`])
            .where({ tenant_id });
        if (locCode) query.whereRaw('loc_code ILIKE ?', [locCode]);
        return query.first();
    },
};
