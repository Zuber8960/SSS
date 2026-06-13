// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const LocationMasterController = require('./locationMaster.controller');


router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;

        const data = await LocationMasterController.getAllLocationData(recId);

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving profile'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const recId = req.user.recId;
        const payload = req.body;

        const data = await LocationMasterController.saveLocationData(recId, payload);
        res.status(201).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error saving location data'
        });
    }
});

router.put('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        const payload = req.body;
        const data = await LocationMasterController.updateLocationData(recId, payload);

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Location data not found'
            });
        }

        res.status(200).json({
            success: true,
            data
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating location data'
        });
    }
});

router.delete('/:recId', async (req, res) => {
    try {
        const { recId } = req.params;
        const userRecId = req.user.recId;

        const deletedCount = await LocationMasterController.deleteLocationData(recId);

        if (!deletedCount) {
            return res.status(404).json({
                success: false,
                message: 'Location data not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Location data deleted successfully'
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting location data'
        });
    }
});

module.exports = router;