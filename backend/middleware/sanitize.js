// middleware/sanitize.js
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Strips $ and . characters from user inputs to prevent NoSQL injection,
 * and recursively trims all string fields in req.body
 */
const trimBodyStrings = (obj) => {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = obj[key].trim();
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      trimBodyStrings(obj[key]);
    }
  }
};

exports.sanitizeData = [
  mongoSanitize(),
  (req, res, next) => {
    if (req.body) {
      trimBodyStrings(req.body);
    }
    next();
  }
];
