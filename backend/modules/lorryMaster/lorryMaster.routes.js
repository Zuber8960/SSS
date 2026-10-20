const express = require('express');
const router = express.Router();
const upload = require('../../middleware/upload');
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

// NOTE: must be declared BEFORE '/:recId', otherwise Express matches the
// literal string "vehicle" as a recId and the lookup never reaches here.
router.get('/vehicle/:vehicleId', async (req, res) => {
    try {
        const { vehicleId } = req.params;
        const { tenant_id } = req;
        const data = await LorryMasterController.getByVehicleId(vehicleId, tenant_id);
        res.status(200).json({ success: true, data: data || null });
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

router.post('/', upload.fields([
    { name: 'doc_permit', maxCount: 1 },
    { name: 'doc_insurance', maxCount: 1 },
    { name: 'doc_vehicle_rc', maxCount: 1 },
    { name: 'doc_fitness', maxCount: 1 },
    { name: 'doc_pollution', maxCount: 1 },
]), async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = { ...req.body };
        delete payload.company_code;
        delete payload.division_code;
        delete payload.tenant_id;

        // Map uploaded file paths into payload
        if (req.files) {
            if (req.files.doc_permit) payload.doc_permit = `lorry/${req.files.doc_permit[0].filename}`;
            if (req.files.doc_insurance) payload.doc_insurance = `lorry/${req.files.doc_insurance[0].filename}`;
            if (req.files.doc_vehicle_rc) payload.doc_vehicle_rc = `lorry/${req.files.doc_vehicle_rc[0].filename}`;
            if (req.files.doc_fitness) payload.doc_fitness = `lorry/${req.files.doc_fitness[0].filename}`;
            if (req.files.doc_pollution) payload.doc_pollution = `lorry/${req.files.doc_pollution[0].filename}`;
        }

        const data = await LorryMasterController.create(recId, payload, {
            tenant_id: req.tenant_id,
            company_code: req.company_code,
            division_code: req.division_code,
            loc_code: req.loc_code,
        });
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error saving lorry data' });
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
        const payload = { ...req.body };
        delete payload.company_code;
        delete payload.division_code;
        delete payload.tenant_id;

        // Map uploaded file paths into payload
        if (req.files) {
            if (req.files.doc_permit) payload.doc_permit = `lorry/${req.files.doc_permit[0].filename}`;
            if (req.files.doc_insurance) payload.doc_insurance = `lorry/${req.files.doc_insurance[0].filename}`;
            if (req.files.doc_vehicle_rc) payload.doc_vehicle_rc = `lorry/${req.files.doc_vehicle_rc[0].filename}`;
            if (req.files.doc_fitness) payload.doc_fitness = `lorry/${req.files.doc_fitness[0].filename}`;
            if (req.files.doc_pollution) payload.doc_pollution = `lorry/${req.files.doc_pollution[0].filename}`;
        }

        const data = await LorryMasterController.update(recId, payload, {
            tenant_id: req.tenant_id,
            company_code: req.company_code,
            division_code: req.division_code,
            loc_code: req.loc_code,
        });
        if (!data) {
            return res.status(404).json({ success: false, message: 'Lorry data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Lorry Master error:', error);
        res.status(error.status || 500).json({ success: false, message: error.message || 'Error updating lorry data' });
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