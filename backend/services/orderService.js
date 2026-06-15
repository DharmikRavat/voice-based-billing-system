// services/orderService.js
const Order = require('../models/Order');
const menuService = require('./menuService');
const billingService = require('./billingService');

const GST_RATE = parseFloat(process.env.GST_RATE || '0.05');

/**
 * Resolves raw textual items to actual menu items
 */
const resolveOrderItems = async (rawItems) => {
  const resolved = [];
  const notFound = [];
  const unavailable = [];

  for (const raw of rawItems) {
    let qty = parseInt(raw.qty) || 1;
    qty = Math.max(1, Math.min(qty, 20));

    const menuMatch = await menuService.getMenuItemByName(raw.name);
    
    if (!menuMatch) {
      notFound.push(raw.name);
      continue;
    }

    if (!menuMatch.available) {
      unavailable.push(menuMatch.name);
      continue;
    }

    resolved.push({
      name: menuMatch.name,
      menuItemId: menuMatch._id,
      quantity: qty,
      unitPrice: menuMatch.price,
      totalPrice: menuMatch.price * qty
    });
  }

  return { resolved, notFound, unavailable };
};

exports.resolveOrderItems = resolveOrderItems;

/**
 * Creates a new order
 */
exports.createOrder = async (payload) => {
  const { items, tableNumber, customerName, paymentMethod, transcript } = payload;
  
  // Use the local function reference — NOT `this`
  const { resolved, notFound, unavailable } = await resolveOrderItems(items);
  
  if (resolved.length === 0) {
    const error = new Error('No valid items found from the provided input');
    error.statusCode = 400;
    throw error;
  }

  const billDetails = billingService.calculateBill(resolved, GST_RATE);
  
  const orderDoc = new Order({
    tableNumber: parseInt(tableNumber) || 1,
    customerName: customerName || 'Guest',
    paymentMethod: paymentMethod || 'Cash',
    transcript,
    ...billDetails
  });

  await orderDoc.save();

  return {
    order: orderDoc,
    warnings: { notFound, unavailable }
  };
};

/**
 * Fetches all orders with pagination and filters
 */
exports.getAllOrders = async (query) => {
  const page = parseInt(query.page, 10) || 1;
  const limit = parseInt(query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.tableNumber) filter.tableNumber = parseInt(query.tableNumber, 10);
  
  if (query.date) {
    const start = new Date(query.date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(query.date);
    end.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: start, $lte: end };
  }

  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Order.countDocuments(filter);

  return {
    orders,
    total,
    page,
    pages: Math.ceil(total / limit)
  };
};

/**
 * Gets a single order by ID
 */
exports.getOrderById = async (id) => {
  const order = await Order.findById(id).populate('items.menuItemId');
  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }
  return order;
};

/**
 * Updates an order's status
 */
const updateOrderStatus = async (id, status) => {
  const validStatuses = ["pending", "paid", "cancelled"];
  if (!validStatuses.includes(status)) {
    const err = new Error('Invalid status value');
    err.statusCode = 400;
    throw err;
  }

  const order = await Order.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true }
  );

  if (!order) {
    const err = new Error('Order not found');
    err.statusCode = 404;
    throw err;
  }

  return order;
};

exports.updateOrderStatus = updateOrderStatus;

/**
 * Soft deletes an order by changing its state to cancelled
 */
exports.deleteOrder = async (id) => {
  // Use the local function reference — NOT `this`
  return await updateOrderStatus(id, 'cancelled');
};
