const express = require('express');
const router = express.Router();
const DivisionMasterController = require('./divisionMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const data = await DivisionMasterController.getAllDivisionData(recId, tenant_id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Division Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving division data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const payload = { ...req.body, tenant_id: req.body.tenant_id || tenant_id };
        const data = await DivisionMasterController.saveDivisionData(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Division Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving division data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const payload = req.body;
        const data = await DivisionMasterController.updateDivisionData(recId, payload, tenant_id);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Division data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Division Master error:', error);
        res.status(500).json({ success: false, message: 'Error updating division data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const deletedCount = await DivisionMasterController.deleteDivisionData(recId, tenant_id);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Division data not found' });
        }
        res.status(200).json({ success: true, message: 'Division data deleted successfully' });
    } catch (error) {
        console.error('Division Master error:', error);
        res.status(500).json({ success: false, message: 'Error deleting division data' });
    }
});

module.exports = router;
