// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const LocationMasterController = require('./locationMaster.controller');


router.get('/', async (req, res) => {
});

router.post('/', async (req, res) => {
});

router.put('/:recId', async (req, res) => {
});

router.delete('/', async (req, res) => {
});

module.exports = router;