require('dotenv').config({
  path: './config/.env'
});




module.exports = {
  client: 'pg',
  pool: {
    min: 2,
    max: 10,  // 🔥 increase this (try 10–20)
    acquireTimeoutMillis: 60000
  },
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  }
};