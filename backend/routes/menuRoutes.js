// routes/menuRoutes.js
const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.route('/')
  .get(menuController.getMenu)
  .post(menuController.createMenuItem);

module.exports = router;
