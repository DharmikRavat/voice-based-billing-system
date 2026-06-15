// models/Order.js
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Menu', required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, unique: true },
  tableNumber: { type: Number, required: true, min: 1 },
  customerName: { type: String, default: 'Guest' },
  items: [orderItemSchema],
  subtotal: { type: Number, required: true, min: 0 },
  gstRate: { type: Number, required: true, min: 0 },
  taxAmount: { type: Number, required: true, min: 0 },
  grandTotal: { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ["Cash", "Card", "UPI"], default: "Cash" },
  status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  transcript: { type: String },
  translatedText: { type: String }
}, {
  timestamps: true
});

orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = `ORD-${Date.now()}`;
  }
  next();
});

orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ tableNumber: 1 });

module.exports = mongoose.model('Order', orderSchema);
