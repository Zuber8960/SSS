// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const CompanyMasterController = require('./companyMaster.controller');


router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;

        const data = await CompanyMasterController.getAllCompanyData(recId);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving company data'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = req.body;

        const existing = await CompanyMasterController.getCompanyDataByRecId(recId);
        if (existing) {
            return res.status(409).json({
                success: false,
                message: 'Company data already exists for this user'
            });
        }

        const data = await CompanyMasterController.saveCompanyData(recId, payload);

        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving company data'
        });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        if (String(userRecId) !== String(recId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to update this company data'
            });
        }

        const payload = req.body;
        const data = await CompanyMasterController.updateCompanyData(recId, payload);

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Company data not found'
            });
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating company data'
        });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        if (String(userRecId) !== String(recId)) {
            return res.status(403).json({
                success: false,
                message: 'Unauthorized to delete this company data'
            });
        }

        const deletedCount = await CompanyMasterController.deleteCompanyData(recId);

        if (!deletedCount) {
            return res.status(404).json({
                success: false,
                message: 'Company data not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Company data deleted successfully'
        });
    } catch (error) {
        console.error('Company Master error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting company data'
        });
    }
});

module.exports = router;
