const express = require('express');
const router = express.Router();
const UserRoleController = require('./userRole.controller');
const adminMiddleware = require('../../middleware/adminMiddleware');

router.get('/', async (req, res) => {
    try {
        const data = await UserRoleController.getAllUserRoles();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('UserRole GET error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving user role mappings' });
    }
});

router.post('/', adminMiddleware, async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = req.body;

        if (!payload.user_id || !payload.role_code) {
            return res.status(400).json({ success: false, message: 'user_id and role_code are required' });
        }

        const existing = await UserRoleController.getByUserAndRole(payload.user_id, payload.role_code);
        if (existing && existing.record_status === 0) {
            return res.status(409).json({ success: false, message: `Mapping for user '${payload.user_id}' and role '${payload.role_code}' already exists` });
        }

        const data = await UserRoleController.createUserRole(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('UserRole POST error:', error);
        res.status(500).json({ success: false, message: 'Error creating user role mapping' });
    }
});

router.delete('/:userId/:roleCode', adminMiddleware, async (req, res) => {
    try {
        const { userId, roleCode } = req.params;
        const recId = req.user.recId;

        const updatedCount = await UserRoleController.softDeleteUserRole(userId, roleCode, recId);

        if (!updatedCount) {
            return res.status(404).json({ success: false, message: 'User role mapping not found' });
        }

        res.status(200).json({ success: true, message: 'User role mapping deleted successfully' });
    } catch (error) {
        console.error('UserRole DELETE error:', error);
        res.status(500).json({ success: false, message: 'Error deleting user role mapping' });
    }
});

module.exports = router;
