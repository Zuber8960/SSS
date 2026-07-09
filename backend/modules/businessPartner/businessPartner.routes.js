const express = require('express');
const router = express.Router();
const BusinessPartnerController = require('./businessPartner.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const data = await BusinessPartnerController.getAllBusinessPartnerData(recId, company_code);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving business partner data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const payload = { ...req.body, company_code: req.body.company_code || company_code };
        const data = await BusinessPartnerController.saveBusinessPartnerData(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error saving business partner data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const payload = req.body;
        const data = await BusinessPartnerController.updateBusinessPartnerData(recId, payload, company_code);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Business partner data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error updating business partner data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const deletedCount = await BusinessPartnerController.deleteBusinessPartnerData(recId, company_code);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Business partner data not found' });
        }
        res.status(200).json({ success: true, message: 'Business partner data deleted successfully' });
    } catch (error) {
        console.error('Business Partner error:', error);
        res.status(500).json({ success: false, message: 'Error deleting business partner data' });
    }
});

module.exports = router;
