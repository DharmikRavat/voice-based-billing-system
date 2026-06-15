// config/db.js
const mongoose = require('mongoose');
let mongoServer = null;

/**
 * Connects to MongoDB with retry logic.
 * Falls back to MongoMemoryServer if remote database is unreachable.
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  try {
    console.log('Attempting to connect to MONGODB_URI...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 4000, // Fail fast (4s) so we can fall back to memory server
    });
    console.log(`MongoDB Connected to remote/local URI: ${mongoose.connection.host}`);
  } catch (error) {
    console.warn(`Could not connect to MongoDB URI (${error.message}). Falling back to In-Memory MongoDB...`);

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();

      await mongoose.connect(mongoUri);
      console.log(`In-Memory MongoDB Connected: ${mongoose.connection.host}`);

      // Auto-seed in-memory database
      await seedInMemoryDB();
    } catch (memError) {
      console.error(`Failed to start In-Memory MongoDB: ${memError.message}`);
      process.exit(1);
    }
  }
};

/**
 * Seeds the in-memory database with default menu items
 */
const seedInMemoryDB = async () => {
  try {
    const Menu = require('../models/Menu');
    const menuData = [
      { name:"Paneer Butter Masala", price:280, category:"Main Course" },
      { name:"Dal Makhani",          price:220, category:"Main Course" },
      { name:"Veg Biryani",          price:260, category:"Rice" },
      { name:"Chicken Biryani",      price:320, category:"Rice" },
      { name:"Butter Naan",          price:50,  category:"Bread" },
      { name:"Garlic Naan",          price:60,  category:"Bread" },
      { name:"Masala Chai",          price:40,  category:"Beverages" },
      { name:"Mango Lassi",          price:90,  category:"Beverages" },
      { name:"Gulab Jamun",          price:80,  category:"Desserts" },
      { name:"Rasmalai",             price:110, category:"Desserts" },
      { name:"Veg Manchurian",       price:180, category:"Starters" },
      { name:"Chicken Tikka",        price:320, category:"Starters" }
    ];

    await Menu.deleteMany();
    
    const enrichedMenuData = menuData.map(item => ({
      ...item,
      normalizedName: item.name.toLowerCase().trim()
    }));

    await Menu.insertMany(enrichedMenuData);
    console.log(`Auto-seeded ${enrichedMenuData.length} menu items into In-Memory MongoDB.`);
  } catch (seedError) {
    console.error(`Error auto-seeding In-Memory MongoDB: ${seedError.message}`);
  }
};

// Handle process termination to clean up the in-memory DB server
process.on('SIGINT', async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
    console.log('In-Memory MongoDB stopped.');
  }
  process.exit(0);
});

module.exports = connectDB;
