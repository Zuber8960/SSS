// const express=require('express');const app=express();app.get('/api/test',(req,res)=>res.json({ok:true}));app.listen(5000);
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// Initialize DB connection
require('./config/db');

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL, // Vite frontend port
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Backend API is running');
});


const authRoutes = require('./routes/userRoutes');
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT;

app.listen(PORT, () => {
  // console.log(JSON.stringify(process.env));
  console.log(`Server running on port ${PORT}`);
});