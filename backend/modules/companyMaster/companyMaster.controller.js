const db = require('../../config/db');

module.exports = {

    async getAllCompanyData(recId, tenant_id) {
        const query = db('sss.ssm_company').select('*');
        if (tenant_id) query.where({ tenant_id, record_status: 0 });
        return query;
    },

    async getCompanyDataByRecId(recId, tenant_id) {
        const query = db('sss.ssm_company').where({ rec_id: recId, record_status: 0 });
        if (tenant_id) query.andWhere({ tenant_id, record_status: 0 });
        return query.first();
    },

    async saveCompanyData(recId, payload) {
        const record = { ...payload, created_by: recId, created_on: new Date(), record_status: 0 };
        const query = db('sss.ssm_company').insert(record).returning('*');
        return query;
    },

    async updateCompanyData(rec_id, payload, tenant_id) {
        payload.regoff_pincode = payload.pincode;
        payload.mobile_no = payload.mobile_no || payload.phone;
        delete payload.id;
        delete payload.pincode;
        delete payload.phone;
        delete payload.rec_id;
        const updates = { ...payload, modified_on: new Date() };
        const query = db('sss.ssm_company').where({ rec_id, record_status: 0 });
        if (tenant_id) query.andWhere({ tenant_id, record_status: 0 });
        return query.update(updates).returning('*');
    },

    async deleteCompanyData(recId, tenant_id) {
        const query = db('sss.ssm_company').where({ rec_id: recId, record_status: 0 });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.update({ record_status: 1, modified_on: new Date() }).returning('*');
    }
};
