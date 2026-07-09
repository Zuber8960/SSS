const db = require('../../config/db');

module.exports = {

    async getAllBusinessPartnerData(recId, company_code) {
        const query = db('sss.ssm_business_partner').select('*');
        if (company_code) query.where({ company_code });
        return query;
    },

    async getBusinessPartnerDataByRecId(recId, company_code) {
        const query = db('sss.ssm_business_partner').where({ record_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.first();
    },

    async saveBusinessPartnerData(recId, payload) {
        delete payload.record_id;
        const record = { ...payload, record_created_by: recId, record_created_on: new Date() };
        return db('sss.ssm_business_partner').insert(record).returning('*');
    },

    async updateBusinessPartnerData(recId, payload, company_code) {
        const updates = { ...payload, record_updated_on: new Date() };
        const query = db('sss.ssm_business_partner').where({ record_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.update(updates).returning('*');
    },

    async deleteBusinessPartnerData(recId, company_code) {
        const query = db('sss.ssm_business_partner').where({ record_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.del();
    }
};
