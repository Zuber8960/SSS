const express = require('express');
const router = express.Router();
const RoleController = require('./role.controller');

router.get('/', async (req, res) => {
    try {
        const data = await RoleController.getAllRoles();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Role GET error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving roles' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = req.body;

        if (!payload.role_code || !payload.role_name) {
            return res.status(400).json({ success: false, message: 'role_code and role_name are required' });
        }

        const existing = await RoleController.getRoleByCode(payload.role_code);
        if (existing) {
            return res.status(409).json({ success: false, message: `Role code '${payload.role_code}' already exists` });
        }

        const data = await RoleController.createRole(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Role POST error:', error);
        res.status(500).json({ success: false, message: 'Error creating role' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const userRecId = req.user.recId;
        const { recId } = req.params;
        const payload = req.body;

        const data = await RoleController.updateRole(recId, userRecId, payload);

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Role PUT error:', error);
        res.status(500).json({ success: false, message: 'Error updating role' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        const updatedCount = await RoleController.softDeleteRole(recId, userRecId);

        if (!updatedCount) {
            return res.status(404).json({ success: false, message: 'Role not found' });
        }

        res.status(200).json({ success: true, message: 'Role deleted successfully' });
    } catch (error) {
        console.error('Role DELETE error:', error);
        res.status(500).json({ success: false, message: 'Error deleting role' });
    }
});

module.exports = router;
