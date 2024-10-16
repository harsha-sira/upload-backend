// models/Receipt.js
const mongoose = require('mongoose');

const receiptSchema = new mongoose.Schema({
  description: { type: String, required: true },
  store: { type: String, required: true },
  priceWithGST: { type: Number, required: true },
  date: { type: Date, required: true },
  purpose: { type: String, enum: ['Work', 'Uber', 'Ecom'], required: true },
  imageURL: { type: String, required: true },
});

const Receipt = mongoose.model('Receipt', receiptSchema);

module.exports = Receipt;
