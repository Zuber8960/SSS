const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
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
router.get('/vehicle/:vehicleId', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { vehicleId } = req.params;
        const { company_code } = req;
        const data = await LorryMasterController.getByVehicleId(vehicleId, company_code);
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

router.post('/', upload.fields([
    { name: 'doc_permit', maxCount: 1 },
    { name: 'doc_insurance', maxCount: 1 },
    { name: 'doc_vehicle_rc', maxCount: 1 },
    { name: 'doc_fitness', maxCount: 1 },
    { name: 'doc_pollution', maxCount: 1 },
]), async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const payload = { ...req.body, company_code: req.body.company_code || company_code };

        // Map uploaded file paths into payload
        if (req.files) {
            if (req.files.doc_permit) payload.doc_permit = req.files.doc_permit[0].path;
            if (req.files.doc_insurance) payload.doc_insurance = req.files.doc_insurance[0].path;
            if (req.files.doc_vehicle_rc) payload.doc_vehicle_rc = req.files.doc_vehicle_rc[0].path;
            if (req.files.doc_fitness) payload.doc_fitness = req.files.doc_fitness[0].path;
            if (req.files.doc_pollution) payload.doc_pollution = req.files.doc_pollution[0].path;
        }

        const data = await LorryMasterController.create(recId, payload, company_code);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving lorry data' });
    }
});

router.put('/:recId', upload.fields([
    { name: 'doc_permit', maxCount: 1 },
    { name: 'doc_insurance', maxCount: 1 },
    { name: 'doc_vehicle_rc', maxCount: 1 },
    { name: 'doc_fitness', maxCount: 1 },
    { name: 'doc_pollution', maxCount: 1 },
]), async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const payload = { ...req.body };

        // Map uploaded file paths into payload
        if (req.files) {
            if (req.files.doc_permit) payload.doc_permit = req.files.doc_permit[0].path;
            if (req.files.doc_insurance) payload.doc_insurance = req.files.doc_insurance[0].path;
            if (req.files.doc_vehicle_rc) payload.doc_vehicle_rc = req.files.doc_vehicle_rc[0].path;
            if (req.files.doc_fitness) payload.doc_fitness = req.files.doc_fitness[0].path;
            if (req.files.doc_pollution) payload.doc_pollution = req.files.doc_pollution[0].path;
        }

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