// middleware/errorHandler.js

/**
 * Centralized global error handler
 */
module.exports = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  let errorResponse = {
    success: false,
    error: 'Server Error'
  };

  // Stack trace is appended only in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.stack = err.stack;
    errorResponse.error = err.message || 'Server Error';
  }

  let statusCode = err.statusCode || 500;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    errorResponse.error = `Resource not found with ID of ${err.value}`;
    statusCode = 400;
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    errorResponse.error = `Duplicate field value entered specifically for: ${field}`;
    statusCode = 409;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    errorResponse.error = message;
    statusCode = 400;
  }
  
  // Custom error messages overriding default generic message for production
  if (process.env.NODE_ENV === 'production' && statusCode !== 500) {
      errorResponse.error = err.message || errorResponse.error;
  }

  res.status(statusCode).json(errorResponse);
};
