const dotenv = require('dotenv');
const path = require('path');
const knex = require('knex');

dotenv.config({
  path: path.join(__dirname, '.env')
});

const knexConfig = require('../knexfile');

const db = knex(knexConfig);

db.raw('SELECT 1')
  .then(() => {
    console.log('PostgreSQL Connected');
  })
  .catch((err) => {
    console.error('Database Connection Error:', err);
  });

module.exports = db;