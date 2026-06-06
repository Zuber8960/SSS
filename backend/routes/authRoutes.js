// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const UserModel = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');

// Login endpoint
router.post('/login', async (req, res, next) => {
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
    const user = await UserModel.authenticateUser(userId, password);

    if (user) {
      // Generate JWT token
      const secret = process.env.JWT_SECRET || 'your_jwt_secret_key';
      const token = jwt.sign(
        {
          userId: user.userid,
          id: user.id,
          role: user.role
        },
        secret,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token: token,
        user: user
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

// Protected route example - Get current user info
router.get('/profile', authMiddleware, (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      user: req.user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await UserModel.getAllUsers();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Database error'
    });
  }
});

module.exports = router;