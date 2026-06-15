// controllers/orderController.js
const orderService = require('../services/orderService');

/**
 * POST /api/orders
 * Creates an order directly mapping parsed items
 */
exports.createOrder = async (req, res, next) => {
  const { order, warnings } = await orderService.createOrder(req.body);

  res.status(201).json({
    success: true,
    data: order,
    warnings
  });
};

/**
 * GET /api/orders
 * Returns paginated orders matching the filter queries
 */
exports.getOrders = async (req, res, next) => {
  const paginatedData = await orderService.getAllOrders(req.query);

  res.status(200).json({
    success: true,
    ...paginatedData
  });
};

/**
 * GET /api/orders/:id
 * Fetches single populated order
 */
exports.getOrderById = async (req, res, next) => {
  const data = await orderService.getOrderById(req.params.id);

  res.status(200).json({
    success: true,
    data
  });
};

/**
 * PATCH /api/orders/:id/status
 * Updates an order's status property
 */
exports.updateOrderStatus = async (req, res, next) => {
  const data = await orderService.updateOrderStatus(req.params.id, req.body.status);

  res.status(200).json({
    success: true,
    data
  });
};

/**
 * DELETE /api/orders/:id
 * Sets order status to cancelled
 */
exports.deleteOrder = async (req, res, next) => {
  await orderService.deleteOrder(req.params.id);

  res.status(200).json({
    success: true,
    message: "Order cancelled"
  });
};
