const express = require('express');
const aws = require('aws-sdk');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const logger = require('./logger'); // Import the logger

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // To handle large base64 image data

const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const multer = require('multer');

// Create a memory storage for multer (for file uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// MongoDB connection
const mongoUrl = process.env.MONGODB_URI;
const client = new MongoClient(mongoUrl);
let db, receiptsCollection;

async function connectToDb() {
  try {
    await client.connect();
    db = client.db('receiptsApp');
    receiptsCollection = db.collection('receipts');
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
  }
}

// Utility to upload image to S3
const uploadToS3 = async (fileBuffer, fileName) => {
  const uploadParams = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: Date.now().toString() + '-' + fileName,
    Body: fileBuffer,
    ACL: 'public-read',
  };

  const upload = new Upload({
    client: s3,
    params: uploadParams,
  });

  const result = await upload.done();
  return result.Location; // Return the S3 URL of the uploaded image
};

// Route to handle file or base64 image upload
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  const { description, store, priceWithGST, date, purpose, base64Image } = req.body;

  let imageBuffer;
  let imageFileName;

  // Handle file upload (if file input is used)
  if (req.file) {
    imageBuffer = req.file.buffer;
    imageFileName = req.file.originalname;
  }
  // Handle base64 image (if camera capture is used)
  else if (base64Image) {
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, ''); // Remove base64 prefix
    imageBuffer = Buffer.from(base64Data, 'base64'); // Convert base64 to buffer
    imageFileName = 'captured-image.jpg'; // You can choose an appropriate name
  } else {
    return res.status(400).json({ error: 'No image provided' });
  }

  try {
    // Upload the image (from file or base64) to S3
    const imageURL = await uploadToS3(imageBuffer, imageFileName);

    // Prepare receipt data for MongoDB
    const receiptData = {
      imageURL,
      description,
      store,
      priceWithGST,
      date: new Date(date),
      purpose,
      dateAdded: new Date(),
    };

    // Insert receipt data into MongoDB
    await receiptsCollection.insertOne(receiptData);
    res.json(receiptData);
  } catch (error) {
    console.error('Error uploading file or saving receipt:', error);
    res.status(500).json({ error: 'Failed to upload receipt' });
  }
});

// Route to get all receipts
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await receiptsCollection.find().toArray();
    logger.info('Fetched receipts:', receipts);
    res.json(receipts);
  } catch (error) {
    logger.error('Error fetching receipts:', error);
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Start the server
connectToDb().then(() => {
  app.listen(3001, () => {
    logger.info('Backend server is running on port 3001');
  });
});
