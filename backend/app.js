// app.js
require('express-async-errors'); // Async wrapper
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const { sanitizeData } = require('./middleware/sanitize');
const errorHandler = require('./middleware/errorHandler');

const menuRoutes = require('./routes/menuRoutes');
const orderRoutes = require('./routes/orderRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

// Security middleware
app.use(helmet());

// FIX: Dynamic CORS — accepts FRONTEND_URL env + localhost fallbacks.
// FIX: Explicit methods + allowedHeaders so preflight requests succeed.
// FIX: app.options('*') ensures OPTIONS preflight is always answered.
const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:5173',
    ].filter(Boolean);
    // Allow requests with no origin (e.g. curl, Postman, mobile apps)
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Answer all preflight requests

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Apply input sanitization layer
app.use(sanitizeData);

// Health check mapping
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime()
  });
});

// Routing
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/ai', aiRoutes);

// Catch 404 for unknown endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Mount Centralized Error Handler last
app.use(errorHandler);

module.exports = app;
