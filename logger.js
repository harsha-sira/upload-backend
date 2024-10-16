// logger.js
const winston = require('winston');

// Configure the logger
const logger = winston.createLogger({
  level: 'info', // Minimum level of messages to log
  format: winston.format.combine(
    winston.format.timestamp(), // Add timestamp
    winston.format.json() // Format logs as JSON
  ),
  transports: [
    new winston.transports.Console(), // Log to console
    new winston.transports.File({ filename: 'error.log', level: 'error' }), // Log errors to a file
    new winston.transports.File({ filename: 'combined.log' }) // Log all messages to a file
  ]
});

module.exports = logger;
