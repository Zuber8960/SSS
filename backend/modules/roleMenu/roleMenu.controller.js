const db = require('../../config/db');

module.exports = {

    async getAllRoleMenus() {
        return db('sss.ssm_role_menu').select('*').orderBy('role_code', 'asc').orderBy('menu_id', 'asc');
    },

    async getRoleMenusByRole(roleCode) {
        return db('sss.ssm_role_menu').select('*').where({ role_code: roleCode }).orderBy('menu_id', 'asc');
    },

    async getByRoleAndMenu(roleCode, menuId) {
        return db('sss.ssm_role_menu').where({ role_code: roleCode, menu_id: menuId }).first();
    },

    async getById(recId) {
        return db('sss.ssm_role_menu').where({ rec_id: recId }).first();
    },

    async createRoleMenu(userId, payload) {
        const record = {
            role_code:  payload.role_code,
            menu_id:    payload.menu_id,
            view_yn:    payload.view_yn || 'N',
            add_yn:     payload.add_yn || 'N',
            edit_yn:    payload.edit_yn || 'N',
            delete_yn:  payload.delete_yn || 'N',
            created_by: String(userId),
            created_on: new Date(),
            updated_by: String(userId),
            updated_on: new Date(),
        };
        return db('sss.ssm_role_menu').insert(record).returning('*');
    },

    async updateRoleMenu(recId, userId, payload) {
        const updates = {
            updated_by: String(userId),
            updated_on: new Date(),
        };
        if (payload.role_code !== undefined) updates.role_code = payload.role_code;
        if (payload.menu_id !== undefined) updates.menu_id = payload.menu_id;
        if (payload.view_yn !== undefined) updates.view_yn = payload.view_yn;
        if (payload.add_yn !== undefined) updates.add_yn = payload.add_yn;
        if (payload.edit_yn !== undefined) updates.edit_yn = payload.edit_yn;
        if (payload.delete_yn !== undefined) updates.delete_yn = payload.delete_yn;

        return db('sss.ssm_role_menu')
            .where({ rec_id: recId })
            .update(updates)
            .returning('*');
    },

    async deleteRoleMenu(recId) {
        return db('sss.ssm_role_menu')
            .where({ rec_id: recId })
            .del();
    },

    async deleteByRoleAndMenu(roleCode, menuId) {
        return db('sss.ssm_role_menu')
            .where({ role_code: roleCode, menu_id: menuId })
            .del();
    },
};
