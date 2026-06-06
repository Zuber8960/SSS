// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const UserModel = require('../models/userModel');
const knex = require('../config/db');

router.get('/users', async (req, res) => {
  try {
   const result = await knex.raw('SELECT * FROM sss.ssm_user');
    const resp = await UserModel.getAllUsers()
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Database error'
    });
  }
});

module.exports = router;