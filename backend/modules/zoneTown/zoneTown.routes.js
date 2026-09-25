const express = require('express');
const router = express.Router();
const ZoneTownController = require('./zoneTown.controller');

/* GET /zone-town — list all mappings (optionally ?zone_code=&loc_code=&cust_code=&cust_loc_code= filters) */
router.get('/', async (req, res) => {
    try {
        const tenant_id = req.tenant_id;
        const { zone_code, loc_code, cust_code, cust_loc_code } = req.query;
        const data = await ZoneTownController.getAllZoneTowns(tenant_id, {
            zone_code, loc_code, cust_code, cust_loc_code,
        });

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Zone Town Mapping error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving zone town mapping data' });
    }
});

/* GET /zone-town/:recId — single mapping by record_id */
router.get('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const tenant_id = req.tenant_id;
        const data = await ZoneTownController.getZoneTownByRecId(recId, tenant_id);
        if (!data) {
            return res.status(404).json({ success: false, message: 'Zone town mapping not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Zone Town Mapping error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving zone town mapping data' });
    }
});

/* POST /zone-town — bulk map towns to a zone (parent customer + zone header) */
router.post('/', async (req, res) => {
    try {
        const userId = req.user?.userId || null;
        const tenant_id = req.tenant_id;
        if (!tenant_id) {
            return res.status(400).json({ success: false, message: 'Tenant information missing from token' });
        }
        const data = await ZoneTownController.saveZoneTowns(userId, req.body || {}, tenant_id);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Zone Town Mapping error:', error);
        const status = /required/i.test(error.message || '') ? 400 : 500;
        res.status(status).json({
            success: false,
            message: error.message || 'Error saving zone town mapping data'
        });
    }
});

/* PUT /zone-town/:recId — update a single town ↔ zone mapping */
router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userId = req.user?.userId || null;
        const tenant_id = req.tenant_id;
        const data = await ZoneTownController.updateZoneTown(recId, req.body || {}, tenant_id, userId);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Zone town mapping not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Zone Town Mapping error:', error);
        const status = /required|updatable/i.test(error.message || '') ? 400 : 500;
        res.status(status).json({
            success: false,
            message: error.message || 'Error updating zone town mapping data'
        });
    }
});

/* DELETE /zone-town/:recId — remove a town mapping by record_id */
router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const tenant_id = req.tenant_id;
        const deletedCount = await ZoneTownController.deleteZoneTown(recId, tenant_id);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Zone town mapping not found' });
        }
        res.status(200).json({ success: true, message: 'Zone town mapping deleted successfully' });
    } catch (error) {
        console.error('Zone Town Mapping error:', error);
        res.status(500).json({ success: false, message: 'Error deleting zone town mapping data' });
    }
});

module.exports = router;
