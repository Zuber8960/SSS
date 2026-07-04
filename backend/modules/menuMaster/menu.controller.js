const db = require('../../config/db');

module.exports = {

    async getAllMenus() {
        return db('sss.ssm_menu').select('*').where({ record_status: 0 }).orderBy('display_seq', 'asc');
    },

    async getMenuByMenuId(menuId) {
        return db('sss.ssm_menu').where({ menu_id: menuId, record_status: 0 }).first();
    },

    async createMenu(recId, payload) {
        const record = {
            menu_id:        payload.menu_id,
            parent_menu_id: payload.parent_menu_id || null,
            menu_name:      payload.menu_name,
            menu_path:      payload.menu_path || null,
            menu_icon:      payload.menu_icon || null,
            display_seq:    payload.display_seq || null,
            active_yn:      payload.active_yn || 'Y',
            record_status:  0,
            created_by:     recId,
            created_on:     new Date(),
            updated_by:     recId,
            updated_on:     new Date(),
        };
        return db('sss.ssm_menu').insert(record).returning('*');
    },

    async updateMenu(recId, recIdUser, payload) {
        const updates = {
            parent_menu_id: payload.parent_menu_id || null,
            menu_name:      payload.menu_name,
            menu_path:      payload.menu_path || null,
            menu_icon:      payload.menu_icon || null,
            display_seq:    payload.display_seq || null,
            active_yn:      payload.active_yn || 'Y',
            updated_by:     recIdUser,
            updated_on:     new Date(),
        };
        return db('sss.ssm_menu').where({ rec_id: parseInt(recId, 10) }).update(updates).returning('*');
    },

    async softDeleteMenu(recId, recIdUser) {
        return db('sss.ssm_menu').where({ rec_id: parseInt(recId, 10) }).update({
            record_status: 1,
            updated_by:    recIdUser,
            updated_on:    new Date(),
        }).returning('*');
    },
};
