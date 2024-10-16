// server.js
const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const connectDB = require('./db');
const Receipt = require('./models/Receipt');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify upload directory
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique file name
  },
});
const upload = multer({ storage });

// Connect to MongoDB
connectDB();

// API Endpoints
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  const { description, store, priceWithGST, date, purpose } = req.body;
  const imageURL = req.file.path; // Path to the uploaded file

  const newReceipt = new Receipt({
    description,
    store,
    priceWithGST,
    date,
    purpose,
    imageURL,
  });

  try {
    await newReceipt.save();
    res.status(201).json({ message: 'Receipt uploaded successfully' });
  } catch (error) {
    console.error('Error uploading receipt:', error);
    res.status(500).json({ message: 'Failed to upload receipt' });
  }
});

app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await Receipt.find().sort({ date: -1 }); // Sort by date (most recent first)
    res.json(receipts);
  } catch (error) {
    console.error('Error fetching receipts:', error);
    res.status(500).json({ message: 'Failed to fetch receipts' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
