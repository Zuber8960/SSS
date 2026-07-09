const db = require('../../config/db');

module.exports = {

    async getAllDivisionData(recId, company_code) {
        const query = db('sss.ssm_division').select('*');
        if (company_code) query.where({ company_code });
        return query;
    },

    async getDivisionDataByRecId(recId, company_code) {
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.first();
    },

    async saveDivisionData(recId, payload) {
        const record = { ...payload, created_by: recId, created_on: new Date() };
        delete record.rec_id;
        return db('sss.ssm_division').insert(record).returning('*');
    },

    async updateDivisionData(recId, payload, company_code) {
        const updates = { ...payload, modified_on: new Date() };
        delete updates.rec_id;
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.update(updates).returning('*');
    },

    async deleteDivisionData(recId, company_code) {
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (company_code) query.andWhere({ company_code });
        return query.del();
    }
};
