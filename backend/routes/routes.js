// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const userRoutes = require("../modules/userMaster/user.routes");
const locationMasterRoutes = require("../modules/locationMaster/locationMaster.routes");
const companyMasterRoutes = require("../modules/companyMaster/companyMaster.routes");
const divisionMasterRoutes = require("../modules/divisionMaster/divisionMaster.routes");
const businessPartnerRoutes = require("../modules/businessPartner/businessPartner.routes");
const docketRoutes = require("../modules/docket/dcoket.routes");
const roleRoutes = require("../modules/roleMaster/role.routes");
const UserController = require('../modules/userMaster/user.controller');
const axios = require('axios');

router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;

    // Validate input
    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        message: 'User ID and password are required'
      });
    }

    // Authenticate user from database
    const user = await UserController.authenticateUser(userId, password);

    if (user) {
      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      const token = jwt.sign(
        {
          recId: user.rec_id,
          userId: user.user_id,
          userName: user.user_name,
          isAdmin: user.is_admin
        },
        secret,
        { expiresIn: '24h' }
      );

      
    const authGet = await axios.get(
      'https://api.whitebooks.in/ewaybillapi/v1.03/ewayapi/getewaybill',
      {
        params: {
          email: process.env.email,
          username: process.env.username,
          password: process.env.password,
        },
        headers: {
          accept: '*/*',
          ip_address: process.env.IP_ADDRESS,
          client_id: process.env.client_id,
          client_secret: process.env.client_secret,
          gstin: process.env.GSTIN,
        },
      }
    );

    console.log(authGet);

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: {
          rec_id: user.rec_id,
          user_id: user.user_id,
          user_name: user.user_name,
          email_id: user.email_id,
          mobile_no: user.mobile_no,
          is_admin: user.is_admin,
          company_code: user.company_code
        }
      });
    } else {
      return res.status(401).json({
        success: false,
        message: 'Invalid User ID or Password'
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { user_id, email_id, mobile_no, new_password } = req.body;
    console.log('Reset password request:', { user_id, email_id, mobile_no });

    // Validate input
    if (!user_id || !email_id || !mobile_no || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'User ID, Email, Mobile No, and New Password are required'
      });
    }

    // Find user by user_id, email_id, and mobile_no
    const { err, user } = await UserController.getUserByCredentials(user_id, email_id, mobile_no);
    if (err.msg) {
      return res.status(400).json({
        success: false,
        message: err.msg
      });
    }

    // Update user's password
    await UserController.updateUserPassword(user.rec_id, new_password);

    res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
});

router.use('/user', authMiddleware, userRoutes);
router.use('/locationMaster', authMiddleware, locationMasterRoutes);
router.use('/companyMaster', authMiddleware, companyMasterRoutes);
router.use('/divisionMaster', authMiddleware, divisionMasterRoutes);
router.use('/businessPartner', authMiddleware, businessPartnerRoutes);
router.use('/docket', authMiddleware, docketRoutes);
router.use('/roleMaster', authMiddleware, roleRoutes);

module.exports = router;
