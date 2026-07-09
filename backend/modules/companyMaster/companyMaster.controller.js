const db = require('../../config/db');

module.exports = {

    async getAllCompanyData(recId, company_code) {
        const query = db('sss.ssm_company').select('*');
        if (company_code) query.where({ company_code });
        return query;
    },

    async getCompanyDataByRecId(recId, company_code) {
        const query = db('sss.ssm_company').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.first();
    },

    async saveCompanyData(recId, payload) {
        const record = { ...payload, created_by: recId, created_on: new Date() };
        return db('sss.ssm_company').insert(record).returning('*');
    },

    async updateCompanyData(recId, payload, company_code) {
        payload.regoff_pincode = payload.pincode;
        payload.mobile_no = payload.phone;
        delete payload.id;
        delete payload.pincode;
        delete payload.phone;
        delete payload.rec_id;
        const updates = { ...payload, modified_on: new Date() };
        const query = db('sss.ssm_company').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.update(updates).returning('*');
    },

    async deleteCompanyData(recId, company_code) {
        const query = db('sss.ssm_company').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.del();
    }
};
