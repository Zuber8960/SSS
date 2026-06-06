const db = require('../config/db');

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

module.exports = {
  getAllUsers,
  getUserById,
  createUser
};