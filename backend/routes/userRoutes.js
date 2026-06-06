// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const UserModel = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * Login endpoint
 * Expected body: { userId: string, password: string }
 */
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
    const user = await UserModel.authenticateUser(userId, password);

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

/**
 * Get current user profile (protected)
 */
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const recId = req.user.recId;
    
    const user = await UserModel.getUserById(recId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      user: user
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving profile'
    });
  }
});

/**
 * Get all users (protected)
 */
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await UserModel.getAllUsers();
    res.status(200).json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

/**
 * Get user by rec_id (protected)
 */
router.get('/users/:recId', authMiddleware, async (req, res) => {
  try {
    const { recId } = req.params;
    const user = await UserModel.getUserById(recId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
});

/**
 * Create new user (protected)
 */
router.post('/users', authMiddleware, async (req, res) => {
  try {
    const { user_id, user_name, password_hash, email_id, mobile_no, company_code, division_code, loc_code, is_admin } = req.body;

    // Validate required fields
    if (!user_id || !user_name || !password_hash || !company_code) {
      return res.status(400).json({
        success: false,
        message: 'User ID, User Name, Password, and Company Code are required'
      });
    }

    const userData = {
      user_id,
      user_name,
      password_hash,
      email_id,
      mobile_no,
      company_code,
      division_code,
      loc_code,
      is_admin: is_admin || 'N',
      created_by: req.user.userId
    };

    const newUser = await UserModel.createUser(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: newUser
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user'
    });
  }
});

/**
 * Update user (protected)
 */
router.put('/users/:recId', authMiddleware, async (req, res) => {
  try {
    const { recId } = req.params;
    const { user_name, email_id, mobile_no, division_code, loc_code, is_admin, user_status } = req.body;

    // Validate that user exists
    const existingUser = await UserModel.getUserById(recId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateData = {
      user_name,
      email_id,
      mobile_no,
      division_code,
      loc_code,
      is_admin,
      user_status,
      modified_by: req.user.userId
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedUser = await UserModel.updateUser(recId, updateData);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user'
    });
  }
});

/**
 * Delete user (soft delete - mark as inactive) (protected)
 */
router.delete('/users/:recId', authMiddleware, async (req, res) => {
  try {
    const { recId } = req.params;

    // Validate that user exists
    const existingUser = await UserModel.getUserById(recId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await UserModel.deleteUser(recId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user'
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
    const user = await UserModel.getUserByCredentials(user_id, email_id, mobile_no);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user's password
    await UserModel.updateUserPassword(user.rec_id, new_password);

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

module.exports = router;