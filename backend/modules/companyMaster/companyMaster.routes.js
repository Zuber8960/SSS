// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const CompanyMasterController = require('./companyMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const data = await CompanyMasterController.getAllCompanyData(recId, company_code);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving company data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const payload = { ...req.body, company_code: req.body.company_code || company_code };
        const data = await CompanyMasterController.saveCompanyData(recId, payload);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving company data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const payload = req.body;
        const data = await CompanyMasterController.updateCompanyData(recId, payload, company_code);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Company data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({ success: false, message: 'Error updating company data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const deletedCount = await CompanyMasterController.deleteCompanyData(recId, company_code);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Company data not found' });
        }
        res.status(200).json({ success: true, message: 'Company data deleted successfully' });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({ success: false, message: 'Error deleting company data' });
    }
});

module.exports = router;
