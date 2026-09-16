const express = require('express');
const router = express.Router();
const RoleMenuController = require('./roleMenu.controller');
const adminMiddleware = require('../../middleware/adminMiddleware');

router.get('/', async (req, res) => {
    try {
        const data = await RoleMenuController.getAllRoleMenus();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('RoleMenu GET error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving role menu mappings' });
    }
});

router.get('/byRole/:roleCode', async (req, res) => {
    try {
        const data = await RoleMenuController.getRoleMenusByRole(req.params.roleCode);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('RoleMenu GET byRole error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving role menu mappings' });
    }
});

router.post('/', adminMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const payload = req.body;

        if (!payload.role_code || !payload.menu_id) {
            return res.status(400).json({ success: false, message: 'role_code and menu_id are required' });
        }

        const existing = await RoleMenuController.getByRoleAndMenu(payload.role_code, payload.menu_id);
        if (existing) {
            // mapping already exists — update its flags instead of duplicating
            const data = await RoleMenuController.updateRoleMenu(existing.rec_id, userId, {
                view_yn: payload.view_yn, add_yn: payload.add_yn, edit_yn: payload.edit_yn, delete_yn: payload.delete_yn,
            });
            return res.status(201).json({ success: true, data });
        }

        const data = await RoleMenuController.createRoleMenu(userId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('RoleMenu POST error:', error);
        res.status(500).json({ success: false, message: 'Error creating role menu mapping' });
    }
});

router.put('/:recId', adminMiddleware, async (req, res) => {
    try {
        const { recId } = req.params;
        const userId = req.user.userId;
        const payload = req.body;

        const data = await RoleMenuController.updateRoleMenu(recId, userId, payload);

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Role menu mapping not found' });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('RoleMenu PUT error:', error);
        res.status(500).json({ success: false, message: 'Error updating role menu mapping' });
    }
});

router.delete('/:recId', adminMiddleware, async (req, res) => {
    try {
        const { recId } = req.params;

        const deletedCount = await RoleMenuController.deleteRoleMenu(recId);

        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Role menu mapping not found' });
        }

        res.status(200).json({ success: true, message: 'Role menu mapping deleted successfully' });
    } catch (error) {
        console.error('RoleMenu DELETE error:', error);
        res.status(500).json({ success: false, message: 'Error deleting role menu mapping' });
    }
});

router.delete('/:roleCode/:menuId', adminMiddleware, async (req, res) => {
    try {
        const { roleCode, menuId } = req.params;

        const deletedCount = await RoleMenuController.deleteByRoleAndMenu(roleCode, menuId);

        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Role menu mapping not found' });
        }

        res.status(200).json({ success: true, message: 'Role menu mapping deleted successfully' });
    } catch (error) {
        console.error('RoleMenu DELETE error:', error);
        res.status(500).json({ success: false, message: 'Error deleting role menu mapping' });
    }
});

module.exports = router;
