const db = require('../../config/db');

module.exports = {

    async getAllUserRoles() {
        return db('sss.ssm_user_role').select('*').where({ record_status: 0 }).orderBy('user_id', 'asc');
    },

    async getByUserAndRole(userId, roleCode) {
        return db('sss.ssm_user_role').where({ user_id: userId, role_code: roleCode }).first();
    },

    async createUserRole(recId, payload) {
        const record = {
            user_id:       payload.user_id,
            role_code:     payload.role_code,
            record_status: 0,
            created_by:    recId,
            created_on:    new Date(),
            updated_by:    recId,
            updated_on:    new Date(),
        };
        return db('sss.ssm_user_role').insert(record).returning('*');
    },

    async softDeleteUserRole(userId, roleCode, recId) {
        return db('sss.ssm_user_role')
            .where({ user_id: userId, role_code: roleCode })
            .update({ record_status: 1, updated_by: recId, updated_on: new Date() });
    },
};
