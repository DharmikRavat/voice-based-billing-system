// server.js
require('dotenv').config();

// FIX: Validate HF_TOKEN on startup — fail loudly rather than silently at runtime.
if (!process.env.HF_TOKEN || !process.env.HF_TOKEN.startsWith('hf_')) {
  console.error('ERROR: Missing or invalid HF_TOKEN in .env');
  console.error('  Expected format: hf_xxxxxxxxxxxxxxxxxxxx');
  console.error('  Get a token at: https://huggingface.co/settings/tokens');
  process.exit(1);
}

// FIX: Validate MONGODB_URI presence on startup.
if (!process.env.MONGODB_URI) {
  console.error('ERROR: MONGODB_URI is not set in .env');
  process.exit(1);
}

const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

let server;

// Prevent application crash on unhandled rejections
process.on('unhandledRejection', (err) => {
  console.log(`Unhandled Rejection: ${err.message}`);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// Prevent unhandled exception
process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

connectDB().then(() => {
  server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);

    // FIX: Print all mounted routes in development for easy verification
    if (process.env.NODE_ENV === 'development') {
      console.log('\nMounted routes:');
      app._router.stack
        .filter(r => r.route)
        .forEach(r => {
          const methods = Object.keys(r.route.methods).map(m => m.toUpperCase()).join(',');
          console.log(`  ${methods} ${r.route.path}`);
        });
    }
  });
});
