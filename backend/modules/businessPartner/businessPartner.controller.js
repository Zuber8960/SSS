const db = require('../../config/db');

module.exports = {

    async getAllBusinessPartnerData(recId) {
        return db('sss.ssm_business_partner')
            .select('*');
    },

    async getBusinessPartnerDataByRecId(recId) {
        return db('sss.ssm_business_partner')
            .where({ rec_id: recId })
            .first();
    },

    async saveBusinessPartnerData(recId, payload) {
        delete payload.record_id;
        const record = {
            ...payload,
            record_created_by: recId,
            record_created_on: new Date()
        };

        return db('sss.ssm_business_partner')
            .insert(record)
            .returning('*');
    },

    async updateBusinessPartnerData(recId, payload) {
        const updates = {
            ...payload,
            record_updated_on: new Date()
        };

        return db('sss.ssm_business_partner')
            .where({ record_id: recId })
            .update(updates)
            .returning('*');
    },

    async deleteBusinessPartnerData(recId) {
        return db('sss.ssm_business_partner')
            .where({ record_id: recId })
            .del();
    }
};