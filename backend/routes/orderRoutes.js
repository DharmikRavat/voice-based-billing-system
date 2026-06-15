// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { validateOrder } = require('../middleware/validateOrder');

router.route('/')
  .post(validateOrder, orderController.createOrder)
  .get(orderController.getOrders);

router.route('/:id')
  .get(orderController.getOrderById)
  .delete(orderController.deleteOrder);

router.route('/:id/status')
  .patch(orderController.updateOrderStatus);

module.exports = router;
