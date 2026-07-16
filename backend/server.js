// const express=require('express');const app=express();app.get('/api/test',(req,res)=>res.json({ok:true}));app.listen(5000);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
app.use(express.json());

// ✅ Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

console.log('FRONTEND_URL =', process.env.FRONTEND_URL);

// CORS configuration
app.use(cors({
  origin: [
    'http://198.38.86.85',
    'http://localhost:4000',
    'http://198.38.86.85/sss',
    'http://198.38.86.85',
    "http://saralsamadhan.in",
    process.env.FRONTEND_URL
  ],
  credentials: true
}));


//app.use(cors(corsOptions));
// app.use(cors('*'));

// Initialize DB connection
require('./config/db');


// ✅ ROOT using process.cwd()
const ROOT_DIR = process.cwd();

// ✅ Load all routes dynamically
const normalizedPath = path.join(__dirname, "routes");

fs.readdirSync(normalizedPath).forEach((file) => {
  if (file.endsWith("routes.js")) {
    const route = require(path.join(normalizedPath, file));
    app.use('/app',route);
  }
});

fs.readdirSync(normalizedPath).forEach((file) => {
  if (file.endsWith("api.route.js")) {
    const route = require(path.join(normalizedPath, file));
    app.use('/api',route);
  }
});


app.use('/', (req, res) => {
  res.send('Backend API is running !');
});


const PORT = process.env.PORT;

app.listen(PORT, () => {
  // console.log(JSON.stringify(process.env));
  console.log(`Server running on port ${PORT}`);
});