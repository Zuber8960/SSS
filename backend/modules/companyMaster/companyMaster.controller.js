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
            rec_id: recId,
            created_on: new Date()
        };

        return db('sss.ssm_company')
            .insert(record)
            .returning('*');
    },

    async updateCompanyData(recId, payload) {
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
