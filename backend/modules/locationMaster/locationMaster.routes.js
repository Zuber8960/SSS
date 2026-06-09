// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const LocationMasterController = require('./locationMaster.controller');


router.get('/', async (req, res) => {
    try {
        const recId = req.user.recId;

        const user = await LocationMasterController.getAllLocationData(recId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Profile retrieved successfully',
            data: user
        });
    } catch (error) {
        console.error('Profile error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving profile'
        });
    }
});

router.post('/', async (req, res) => {
});

router.put('/:recId', async (req, res) => {
});

router.delete('/', async (req, res) => {
});

module.exports = router;