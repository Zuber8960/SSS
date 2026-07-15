// const r=require('express').Router(); r.post('/login',(req,res)=>res.json({success:true})); module.exports=r;
const express = require('express');
const router = express.Router();
const UserContoller = require('./user.controller');

router.get('/profile', async (req, res) => {
  try {
    const recId = req.user.recId;
    const user = await UserContoller.getUserById(recId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, message: 'Profile retrieved successfully', user });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ success: false, message: 'Error retrieving profile' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { tenant_id } = req;
    const users = await UserContoller.getAllUsers(tenant_id);
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, message: 'Error fetching users' });
  }
});

router.get('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const { tenant_id } = req;
    const user = await UserContoller.getUserById(recId, tenant_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, message: 'Error fetching user' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { tenant_id } = req;
    const { user_id, user_name, password_hash, email_id, mobile_no, division_code, location_id, is_admin } = req.body;
    if (!user_id || !user_name || !password_hash || !tenant_id) {
      return res.status(400).json({ success: false, message: 'User ID, User Name, Password, and Tenant ID are required' });
    }
    const userData = {
      user_id, user_name, password_hash, email_id, mobile_no,
      tenant_id, division_code, location_id,
      is_admin: is_admin || 'N',
      created_by: req.user.userId
    };
    const newUser = await UserContoller.createUser(userData);
    res.status(201).json({ success: true, message: 'User created successfully', data: newUser });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

router.put('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const { tenant_id } = req;
    const { user_name, email_id, mobile_no, division_code, loc_code, is_admin, user_status } = req.body;
    const existingUser = await UserContoller.getUserById(recId, tenant_id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const updateData = { user_name, email_id, mobile_no, division_code, loc_code, is_admin, user_status, modified_by: req.user.userId };
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
    const updatedUser = await UserContoller.updateUser(recId, updateData);
    res.status(200).json({ success: true, message: 'User updated successfully', data: updatedUser });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ success: false, message: 'Error updating user' });
  }
});

router.delete('/:recId', async (req, res) => {
  try {
    const { recId } = req.params;
    const { tenant_id } = req;
    const existingUser = await UserContoller.getUserById(recId, tenant_id);
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    await UserContoller.deleteUser(recId);
    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, message: 'Error deleting user' });
  }
});

module.exports = router;
