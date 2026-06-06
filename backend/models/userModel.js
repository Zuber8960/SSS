const db = require('../config/db');
const bcrypt = require('bcrypt');
const knex = require('knex');

const getAllUsers = async () => {
  return db('sss.ssm_user').select('*');
};

const getUserById = async (id) => {
  return db('sss.ssm_user')
    .where({ id })
    .first();
};

const createUser = async (userData) => {
  return db('sss.ssm_user')
    .insert(userData)
    .returning('*');
};

/**
 * Authenticate user by userId and password
 * @param {string} userId - User ID
 * @param {string} password - Plain text password
 * @returns {Object} - User object if authenticated, null otherwise
 */
const authenticateUser = async (userId, password) => {
  try {
    // Query user by userId
    const user = await db('sss.ssm_user')
      .where({ user_id: userId })
      .first();

    // Check if user exists
    if (!user) {
      return null;
    }

    let passwordMatch;
    // Compare password with stored hash
    if (/^[A-Za-z0-9]+$/.test(user.password_hash)) {
      // If password_hash is not a valid bcrypt hash, compare directly (for legacy passwords)
      passwordMatch = user.password_hash === password;      
    } else {
      passwordMatch = await bcrypt.compare(password, user.password_hash);
    }

    if (passwordMatch) {
      // Remove password from returned object for security
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  authenticateUser
};