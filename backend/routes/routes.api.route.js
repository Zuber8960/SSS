// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const userRoutes = require("../modules/userMaster/user.routes");
const locationMasterRoutes = require("../modules/locationMaster/locationMaster.routes");
const companyMasterRoutes = require("../modules/companyMaster/companyMaster.routes");
const docketRoutes = require("../modules/docket/dcoket.routes");
const UserController = require('../modules/userMaster/user.controller');

router.use('/user', userRoutes);
router.use('/locationMaster', locationMasterRoutes);
router.use('/companyMaster', companyMasterRoutes);
router.use('/docket', docketRoutes);

router.use('/docket', docketRoutes);

module.exports = router;