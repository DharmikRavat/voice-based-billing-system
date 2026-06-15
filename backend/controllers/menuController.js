// controllers/menuController.js
const menuService = require('../services/menuService');

/**
 * GET /api/menu
 * Fetches all menu items based on filters passed via query
 */
exports.getMenu = async (req, res, next) => {
  const { category, available } = req.query;
  const filters = { category, available };

  const data = await menuService.getAllMenuItems(filters);

  res.status(200).json({
    success: true,
    count: data.length,
    data
  });
};

/**
 * POST /api/menu
 * Creates a new menu item
 */
exports.createMenuItem = async (req, res, next) => {
  const data = await menuService.createMenuItem(req.body);

  res.status(201).json({
    success: true,
    data
  });
};
