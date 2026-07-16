// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const LocationMasterController = require('./locationMaster.controller');

router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const data = await LocationMasterController.getAllLocationData(recId, tenant_id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving location data' });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const { tenant_id } = req;
        const payload = req.body;
        const data = await LocationMasterController.saveLocationData(recId, payload, tenant_id);
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error saving location data' });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const { tenant_id } = req;
        const payload = req.body;
        const data = await LocationMasterController.updateLocationData(recId, payload, tenant_id);
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
        const { tenant_id } = req;
        const deletedCount = await LocationMasterController.deleteLocationData(recId, tenant_id);
        if (!deletedCount) {
            return res.status(404).json({ success: false, message: 'Location data not found' });
        }
        res.status(200).json({ success: true, message: 'Location data deleted successfully' });
    } catch (error) {
        console.error('Location Master error:', error);
        res.status(500).json({ success: false, message: 'Error deleting location data' });
    }
});

router.get('/towns', async (req, res) => {
    try {
        const { loc_code } = req.query;
        const { tenant_id } = req;
        const data = await LocationMasterController.getTownsByLocationCode(loc_code, tenant_id);
        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Location Town error:', error);
        res.status(500).json({ success: false, message: 'Error retrieving location towns' });
    }
});

module.exports = router;
