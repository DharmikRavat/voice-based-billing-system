// models/Menu.js
const mongoose = require('mongoose');

const menuSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  normalizedName: {
    type: String
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ["Starters", "Main Course", "Rice", "Bread", "Beverages", "Desserts", "Sides"],
    required: true
  },
  available: {
    type: Boolean,
    default: true
  },
  description: {
    type: String
  }
}, {
  timestamps: true
});

menuSchema.pre('save', function(next) {
  if (this.isModified('name') || this.isNew) {
    this.normalizedName = this.name.toLowerCase().trim();
  }
  next();
});

menuSchema.index({ normalizedName: 1 });
menuSchema.index({ category: 1 });

module.exports = mongoose.model('Menu', menuSchema);
