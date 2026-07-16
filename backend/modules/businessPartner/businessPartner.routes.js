const express = require('express');
const router = express.Router();
const BusinessPartnerController = require('./businessPartner.controller');

router.get('/types', async (req, res) => {
    try {
        const data = await BusinessPartnerController.getAllBpTypes();
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP Types error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving BP types' });
    }
});

router.get('/byBpName/:bpName', async (req, res) => {
    try {
        const { tenant_id } = req;
        const { loc_code } = req.query;
        const data = await BusinessPartnerController.getBusinessPartnerByBpName(
            req.params.bpName,
            loc_code || null,
            tenant_id.toString()
        );
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP by BP Name error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.get('/byPanName/:panName', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.getBusinessPartnerByPanName(
            req.params.panName,
            tenant_id.toString()
        );
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('BP by PAN Name error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.get('/', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.getAllBusinessPartnerData(tenant_id.toString());
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner data' });
    }
});

router.get('/:recId', async (req, res) => {
    try {
        const data = await BusinessPartnerController.getBusinessPartnerDataByRecId(req.params.recId);
        if (!data) return res.status(404).json({ success: false, message: 'Business partner not found' });
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { tenant_id } = req;
        const userId = req.user?.recId;
        const data = await BusinessPartnerController.saveBusinessPartnerData(userId, { ...req.body, tenant_id });
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error saving business partner data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { tenant_id } = req;
        const data = await BusinessPartnerController.updateBusinessPartnerData({ recId: req.params.recId, tenant_id }, req.body);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Business partner not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error updating business partner data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const deletedCount = await BusinessPartnerController.deleteBusinessPartnerData(req.params.recId);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Business partner not found' });
        }
        res.status(200).json({ success: true, message: 'Business partner deleted successfully' });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error deleting business partner data' });
    }
});

module.exports = router;
