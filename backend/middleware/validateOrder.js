// middleware/validateOrder.js
const { body, validationResult } = require('express-validator');

exports.validateOrder = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Items must be a non-empty array'),
  body('items.*.name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Item name is required and must be a string'),
  body('items.*.qty')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Item quantity must be between 1 and 20'),
  body('tableNumber')
    .exists()
    .isInt({ min: 1 })
    .withMessage('Table number is required and must be at least 1'),
  body('paymentMethod')
    .optional()
    .isIn(["Cash", "Card", "UPI"])
    .withMessage('Payment method must be Cash, Card, or UPI'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    next();
  }
];
