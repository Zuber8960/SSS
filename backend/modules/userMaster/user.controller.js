const db = require('../../config/db');
const bcrypt = require('bcrypt');

const getAllUsers = async () => {
  return db('sss.ssm_user')
    .where({ 'record_status': 0 })
    .select('rec_id', 'user_id', 'user_name', 'email_id', 'mobile_no', 'company_code', 'is_admin', 'last_login_on', 'created_on', 'user_status');
};

const getUserById = async (recId) => {
  return db('sss.ssm_user')
    .where({ rec_id: recId })
    .select('rec_id', 'user_id', 'user_name', 'email_id', 'mobile_no', 'company_code', 'division_code', 'loc_code', 'is_admin', 'user_status', 'last_login_on', 'created_on')
    .first();
};

/**
 * Get user by user_id (login ID)
 */
const getUserByUserId = async (userId) => {
  return db('sss.ssm_user')
    .where({ user_id: userId })
    .first();
};

/**
 * Create new user
 */
const createUser = async (userData) => {
  const hashedPassword = await bcrypt.hash(userData.password_hash, 10);
  
  return db('sss.ssm_user')
    .insert({
      user_id: userData.user_id,
      user_name: userData.user_name,
      password_hash: hashedPassword,
      company_code: userData.company_code,
      division_code: userData.division_code || null,
      loc_code: userData.loc_code || null,
      mobile_no: userData.mobile_no || null,
      email_id: userData.email_id || null,
      is_admin: userData.is_admin || 'N',
      user_status: userData.user_status || 'A',
      created_by: userData.created_by,
      created_on: new Date()
    })
    .returning(['rec_id', 'user_id', 'user_name', 'email_id']);
};


const updateUserPassword = async (recId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return db('sss.ssm_user')
    .where({ rec_id: recId })
    .update({ password_hash: hashedPassword });
};


const getUserByCredentials = async (userId, email, mobile_no) => {
  const user = await db('sss.ssm_user')
    .where({ user_id: userId, email_id: email, mobile_no: mobile_no, user_status : 'A' })
    .first();
  if (!user) {
    return null;
  }
  return user;
}

/**
 * Update user
 */
const updateUser = async (recId, userData) => {
  return db('sss.ssm_user')
    .where({ rec_id: recId })
    .update({
      ...userData,
      modified_on: new Date(),
      modified_by: userData.modified_by
    })
    .returning(['rec_id', 'user_id', 'user_name', 'user_status']);
};

/**
 * Delete user (soft delete - marks as inactive)
 */
const deleteUser = async (recId) => {
  return db('sss.ssm_user')
    .where({ rec_id: recId })
    .update({
      record_status: 1,
      modified_on: new Date()
    });
};

/**
 * Authenticate user by user_id and password
 * @param {string} userId - User ID (login ID)
 * @param {string} password - Plain text password
 * @returns {Object} - User object if authenticated, null otherwise
 */
const authenticateUser = async (userId, password) => {
  try {
    // Query user by user_id and active status
    const user = await db('sss.ssm_user')
      .where({ user_id: userId, record_status: 0 })
      .first();

    // Check if user exists
    if (!user) {
      return null;
    }

    // Check if account is locked
    if (user.user_status === 'I') {
      return null;
    }

    // Compare password with stored hash
    let passwordMatch = await bcrypt.compare(password, user.password_hash);
    
    // If password_hash is not a valid bcrypt hash, compare directly (for legacy passwords)
    if (!passwordMatch) {
      passwordMatch = user.password_hash === password;      
    }

    if (passwordMatch) {
      // Update last login timestamp
      await db('sss.ssm_user')
        .where({ rec_id: user.rec_id })
        .update({ last_login_on: new Date() });

      // Remove password from returned object for security
      const { password_hash, ...userWithoutPassword } = user;
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
  getUserByUserId,
  createUser,
  updateUser,
  deleteUser,
  authenticateUser,
  updateUserPassword,
  getUserByCredentials
};