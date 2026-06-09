// const express=require('express');const app=express();app.get('/api/test',(req,res)=>res.json({ok:true}));app.listen(5000);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
const fs = require('fs');
app.use(express.json());

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Vite frontend port
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

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

// const routes = require('./routes/routes');
// app.use('/app', routes);

app.use('/', (req, res) => {
  res.send('Backend API is running');
});


const PORT = process.env.PORT;

app.listen(PORT, () => {
  // console.log(JSON.stringify(process.env));
  console.log(`Server running on port ${PORT}`);
});