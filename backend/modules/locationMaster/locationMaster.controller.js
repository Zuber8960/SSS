const db = require('../../config/db');

module.exports = {

    async getAllLocationData(recId) {
        return db('sss.ssm_location')
            .select('*');
    },

    async getLocationDataByRecId(recId) {
        return db('sss.ssm_location')
            .where({ rec_id: recId })
            .first();
    },

    async saveLocationData(recId, payload) {

        let companyData = await db('sss.ssm_company').select('*').orderBy('company_code', 'desc').first();
        const record = {
            ...payload,
            record_created_by: recId,
            record_created_on: new Date(),
            company_code: companyData.company_code,
            division_code: companyData.company_code + 1,
            loc_id: companyData.company_code + 1,
        };

        return db('sss.ssm_location')
            .insert(record)
            .returning('*');
    },

    async updateLocationData(recId, payload) {
        const updates = {
            ...payload,
            record_updated_on: new Date(),
            record_updated_by: recId
        };
        delete updates.id; // Ensure id is not updated
        delete updates.record_id
        return db('sss.ssm_location')
            .where({ record_id: payload.record_id })
            .update(updates)
            .returning('*');
    },

    async deleteLocationData(recId) {
        return db('sss.ssm_location')
            .where({ rec_id: recId })
            .del();
    }
};