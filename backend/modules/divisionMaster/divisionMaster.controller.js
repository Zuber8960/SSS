const db = require('../../config/db');

module.exports = {

    async getAllDivisionData(recId, tenant_id) {
        const query = db('sss.ssm_division').select('*');
        if (tenant_id) query.where({ tenant_id });
        return query;
    },

    async getDivisionDataByRecId(recId, tenant_id) {
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.first();
    },

    async saveDivisionData(recId, payload) {
        const record = { ...payload, created_by: recId, created_on: new Date() };
        delete record.rec_id;
        return db('sss.ssm_division').insert(record).returning('*');
    },

    async updateDivisionData(recId, payload, tenant_id) {
        const updates = { ...payload, modified_on: new Date() };
        delete updates.rec_id;
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.update(updates).returning('*');
    },

    async deleteDivisionData(recId, tenant_id) {
        const query = db('sss.ssm_division').where({ rec_id: recId });
        if (tenant_id) query.andWhere({ tenant_id });
        return query.del();
    }
};
