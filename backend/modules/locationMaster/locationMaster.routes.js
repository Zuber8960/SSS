// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const LocationMasterController = require('./locationMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const data = await LocationMasterController.getAllLocationData(recId, company_code);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving location data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { company_code } = req;
        const payload = req.body;
        const data = await LocationMasterController.saveLocationData(recId, payload, company_code);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving location data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const payload = req.body;
        const data = await LocationMasterController.updateLocationData(recId, payload, company_code);
        if (!data || data.length === 0) {
            return res.status(404).json({ success: false, message: 'Location data not found' });
        }
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error updating location data' });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { company_code } = req;
        const deletedCount = await LocationMasterController.deleteLocationData(recId, company_code);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Location data not found' });
        }
        res.status(200).json({ success: true, message: 'Location data deleted successfully' });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error deleting location data' });
    }
});

module.exports = router;
