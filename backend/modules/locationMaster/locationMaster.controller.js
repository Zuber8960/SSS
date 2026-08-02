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
        // let locationData = await db('sss.ssm_location').select('*').orderBy('loc_id', 'desc').first();
        const record = {
            ...payload,
            record_created_by: recId,
            record_created_on: new Date(),
            company_code: payload.company_code || company_code,
            division_code: Number(payload.division_code) || 0,
            loc_id: payload.loc_id || 0,
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
    },

    async getTownsByLocationCode(locCode, company_code) {
        const query = db('sss.ssm_location_town').select('*');
        if (locCode) query.where({ loc_code: locCode });
        if (company_code) query.where({ company_code });
        return query.orderBy('town_name', 'asc');
    },

    async addTownToLocation(locCode, townName, company_code) {
        if (!locCode || !townName) {
            throw new Error('loc_code and town_name are required');
        }

        const record = {
            loc_code: locCode,
            town_name: townName,
            company_code: company_code || null,
        };

        return db('sss.ssm_location_town').insert(record).returning('*');
    },

    async updateTownLocation(townName, fromLocCode, toLocCode, company_code, new_town_name) {

        const query = db('sss.ssm_location_town').where({ town_name: townName, loc_code: fromLocCode });
        if (company_code) query.andWhere({ company_code });

        if (new_town_name) {
            return query.update({ town_name: new_town_name }).returning('*');
        }

        return query.update({ loc_code: toLocCode }).returning('*');
    },

    async deleteTownFromLocation(locCode, townName, company_code) {
        if (!townName) {
            throw new Error('town_name is required');
        }

        const query = db('sss.ssm_location_town').where({ town_name: townName });
        if (locCode) query.andWhere({ loc_code: locCode });
        if (company_code) query.andWhere({ company_code });

        return query.del();
    }
};
