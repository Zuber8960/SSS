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

router.get('/', async (req, res) => {
    try {
        const { company_code } = req;
        const data = await BusinessPartnerController.getAllBusinessPartnerData(company_code.toString());
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
        const userId = req.user?.recId;
        const data = await BusinessPartnerController.saveBusinessPartnerData(userId, req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error saving business partner data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const data = await BusinessPartnerController.updateBusinessPartnerData(req.params.recId, req.body);
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
