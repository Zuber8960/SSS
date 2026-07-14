const express = require('express');
const router = express.Router();
const LorryMasterController = require('./lorryMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const data = await LorryMasterController.getAll(recId, tenant_id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving lorry data' });
    }
});

router.get('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const data = await LorryMasterController.getByRecId(recId, tenant_id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Lorry data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving lorry data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const payload = { ...req.body, tenant_id };
        const data = await LorryMasterController.create(recId, payload, tenant_id);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving lorry data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const payload = req.body;
        const data = await LorryMasterController.update(recId, payload, tenant_id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Lorry data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error updating lorry data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const deletedCount = await LorryMasterController.remove(recId, tenant_id);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Lorry data not found' });
        }
        res.status(200).json({ success: true, message: 'Lorry data deleted successfully' });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error deleting lorry data' });
    }
});

module.exports = router;