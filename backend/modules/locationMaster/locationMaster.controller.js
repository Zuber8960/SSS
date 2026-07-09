const db = require('../../config/db');

module.exports = {

    async getAllLocationData(recId, company_code) {
        const query = db('sss.ssm_location').select('*');
        if (company_code) query.where({ company_code });
        return query;
    },

    async getLocationDataByRecId(recId, company_code) {
        const query = db('sss.ssm_location').where({ record_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.first();
    },

    async saveLocationData(recId, payload, company_code) {
        let locationData = await db('sss.ssm_location').select('*').orderBy('loc_id', 'desc').first();
        const record = {
            ...payload,
            record_created_by: recId,
            record_created_on: new Date(),
            company_code: payload.company_code || company_code,
            division_code: locationData ? locationData.division_code + 1 : 1,
            loc_id: locationData ? locationData.loc_id + 1 : 1,
        };
        return db('sss.ssm_location').insert(record).returning('*');
    },

    async updateLocationData(recId, payload, company_code) {
        const updates = { ...payload, record_updated_on: new Date(), record_updated_by: recId };
        delete updates.id;
        delete updates.record_id;
        const query = db('sss.ssm_location').where({ record_id: payload.record_id });
        if (company_code) query.andWhere({ company_code });
        return query.update(updates).returning('*');
    },

    async deleteLocationData(recId, company_code) {
        const query = db('sss.ssm_location').where({ record_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.del();
    }
};
