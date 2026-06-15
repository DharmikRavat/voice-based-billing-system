// seed/seedMenu.js
require('dotenv').config({ path: '../.env' }); // Adjust depending on exec path
const mongoose = require('mongoose');
const Menu = require('../models/Menu');

// Fallback logic for .env resolution
if(!process.env.MONGODB_URI) {
  require('dotenv').config({ path: './.env' });
}

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

const seedDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    await Menu.deleteMany();
    console.log('Old menu items cleared.');

    const enrichedMenuData = menuData.map(item => ({
      ...item,
      normalizedName: item.name.toLowerCase().trim()
    }));

    const docs = await Menu.insertMany(enrichedMenuData);
    console.log(`Successfully inserted ${docs.length} menu items.`);
    
    mongoose.disconnect();
    console.log('Database operation complete, disconnecting.');
    process.exit(0);

  } catch (error) {
    console.error('Error with seed process: ', error);
    process.exit(1);
  }
};

seedDB();
