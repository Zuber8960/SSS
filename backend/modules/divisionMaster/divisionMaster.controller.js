const db = require('../../config/db');

module.exports = {

    async getAllDivisionData(recId) {
        return db('sss.ssm_division')
            .select('*');
    },

    async getDivisionDataByRecId(recId) {
        return db('sss.ssm_division')
            .where({ rec_id: recId })
            .first();
    },

    async saveDivisionData(recId, payload) {
        const record = {
            ...payload,
            created_by: recId,
            created_on: new Date()
        };
        delete record.rec_id;
        return db('sss.ssm_division')
            .insert(record)
            .returning('*');
    },

    async updateDivisionData(recId, payload) {
        const updates = {
            ...payload,
            modified_on: new Date()
        };
        delete updates.rec_id
        return db('sss.ssm_division')
            .where({ rec_id: recId })
            .update(updates)
            .returning('*');
    },

    async deleteDivisionData(recId) {
        return db('sss.ssm_division')
            .where({ rec_id: recId })
            .del();
    }
};