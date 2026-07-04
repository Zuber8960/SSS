const express = require('express');
const router = express.Router();
const MenuController = require('./menu.controller');
const adminMiddleware = require('../../middleware/adminMiddleware');

router.get('/', async (req, res) => {
    try {
        const data = await MenuController.getAllMenus();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Menu GET error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving menus' });
    }
});

router.post('/', adminMiddleware, async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = req.body;

        if (!payload.menu_id || !payload.menu_name) {
            return res.status(400).json({ success: false, message: 'menu_id and menu_name are required' });
        }

        const existing = await MenuController.getMenuByMenuId(payload.menu_id);
        if (existing) {
            return res.status(409).json({ success: false, message: `Menu ID '${payload.menu_id}' already exists` });
        }

        const data = await MenuController.createMenu(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Menu POST error:', error);
        res.status(500).json({ success: false, message: 'Error creating menu' });
    }
});

router.put('/:recId', adminMiddleware, async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;
        const payload = req.body;

        const data = await MenuController.updateMenu(recId, userRecId, payload);

        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Menu not found' });
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Menu PUT error:', error);
        res.status(500).json({ success: false, message: 'Error updating menu' });
    }
});

router.delete('/:recId', adminMiddleware, async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        const updatedCount = await MenuController.softDeleteMenu(recId, userRecId);

        if (!updatedCount) {
            return res.status(404).json({ success: false, message: 'Menu not found' });
        }

        res.status(200).json({ success: true, message: 'Menu deleted successfully' });
    } catch (error) {
        console.error('Menu DELETE error:', error);
        res.status(500).json({ success: false, message: 'Error deleting menu' });
    }
});

module.exports = router;
