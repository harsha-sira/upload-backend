const express = require('express');
const { S3Client } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const multer = require('multer');

// Create an Express app
const app = express();
app.use(cors());
app.use(express.json());

// Multer storage setup
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// AWS S3 client setup
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
  } catch (error) {
  }
}

// Route to handle file and data upload
app.post('/api/upload', upload.single('receipt'), async (req, res) => {
  const { description, store, priceWithGST, date, purpose } = req.body;

  // Check for uploaded file
  let imageURL;
  if (req.file) {
    // If file uploaded, use that
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: Date.now().toString() + '-' + req.file.originalname,
      Body: req.file.buffer,
      ACL: 'public-read',
    };

    try {
      const upload = new Upload({
        client: s3,
        params: uploadParams,
      });

      const receiptURL = await upload.done();
      imageURL = receiptURL.Location;
    } catch (error) {
      console.error('Error uploading file:', error);
      return res.status(500).json({ error: 'Failed to upload receipt' });
    }
  } else if (req.body.base64Image) {
    // Handle base64 image
    console.log("aaaaaaaa")
    const base64Data = req.body.base64Image.replace(/^data:image\/jpeg;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const uploadParams = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: Date.now().toString() + '-captured-image.jpeg',
      Body: buffer,
      ACL: 'public-read',
    };

    try {
      const upload = new Upload({
        client: s3,
        params: uploadParams,
      });

      const receiptURL = await upload.done();
      imageURL = receiptURL.Location;
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      return res.status(500).json({ error: 'Failed to upload receipt' });
    }
  }

  const receiptData = {
    imageURL,
    description,
    store,
    priceWithGST,
    date: new Date(date),
    purpose,
    dateAdded: new Date(),
  };

  await receiptsCollection.insertOne(receiptData);
  res.json(receiptData);
});

// Route to get all receipts
app.get('/api/receipts', async (req, res) => {
  try {
    const receipts = await receiptsCollection.find().toArray();
    res.json(receipts);
  } catch (error) {
  
    res.status(500).json({ error: 'Failed to fetch receipts' });
  }
});

// Start the server
connectToDb().then(() => {
  app.listen(3001, () => {
    
  });
});
