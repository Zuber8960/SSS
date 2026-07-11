const express = require('express');
const router = express.Router();
const LorryMasterController = require('./lorryMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const data = await LorryMasterController.getAll(recId, company_code);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving lorry data' });
    }
});

router.get('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const data = await LorryMasterController.getByRecId(recId, company_code);
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
        const { company_code } = req;
        const payload = { ...req.body, company_code: req.body.company_code || company_code };
        const data = await LorryMasterController.create(recId, payload, company_code);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving lorry data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const payload = req.body;
        const data = await LorryMasterController.update(recId, payload, company_code);
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
        const { company_code } = req;
        const deletedCount = await LorryMasterController.remove(recId, company_code);
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