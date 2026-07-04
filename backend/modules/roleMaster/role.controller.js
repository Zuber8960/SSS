const db = require('../../config/db');

module.exports = {

    async getAllRoles() {
        return db('sss.ssm_role').select('*').where({ record_status: 0 }).orderBy('role_code', 'asc');
    },

    async getRoleByCode(roleCode) {
        return db('sss.ssm_role').where({ role_code: roleCode, record_status: 0 }).first();
    },

    async createRole(recId, payload) {
        const record = {
            role_code: payload.role_code,
            role_name: payload.role_name,
            role_status: payload.role_status || 'A',
            record_status: 0,
            created_by: recId,
            created_on: new Date(),
            updated_by: recId,
            updated_on: new Date(),
        };
        return db('sss.ssm_role').insert(record).returning('*');
    },

    async updateRole(recId, recIdUser, payload) {
        const updates = {
            role_name: payload.role_name,
            role_status: payload.role_status,
            updated_by: recIdUser,
            updated_on: new Date(),
        };
        return db('sss.ssm_role').where({ rec_id: parseInt(recId, 10) }).update(updates).returning('*');
    },

    async softDeleteRole(recId, recIdUser) {
        return db('sss.ssm_role').where({ rec_id: parseInt(recId, 10) }).update({ record_status: 1, updated_by: recIdUser, updated_on: new Date() }).returning('*');
    },
};
