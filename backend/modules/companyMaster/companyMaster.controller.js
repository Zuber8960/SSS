const db = require('../../config/db');

module.exports = {

    async getAllCompanyData(recId) {
        return db('sss.ssm_company')
            .select('*');
    },

    async getCompanyDataByRecId(recId) {
        return db('sss.ssm_company')
            .where({ rec_id: recId })
            .first();
    },

    async saveCompanyData(recId, payload) {
        const record = {
            ...payload,
            created_by: recId,
            created_on: new Date()
        };

        return db('sss.ssm_company')
            .insert(record)
            .returning('*');
    },

    async updateCompanyData(recId, payload) {
        payload.regoff_pincode = payload.pincode;
        payload.mobile_no = payload.phone;
        delete payload.id;
        delete payload.pincode;
        delete payload.phone;
        delete payload.rec_id;
        const updates = {
            ...payload,
            modified_on: new Date()
        };

        return db('sss.ssm_company')
            .where({ rec_id: recId })
            .update(updates)
            .returning('*');
    },

    async deleteCompanyData(recId) {
        return db('sss.ssm_company')
            .where({ rec_id: recId })
            .del();
    }
};
