// services/menuService.js
const Menu = require('../models/Menu');

let menuCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60s

/**
 * Retrieves all menu items optionally applying category and available filters
 * @param {Object} filters - Optional filters
 * @param {string} filters.category - Menu category
 * @param {boolean|string} filters.available - Menu item availability
 * @returns {Promise<Array>}
 */
exports.getAllMenuItems = async (filters = {}) => {
  const query = {};
  if (filters.category) query.category = filters.category;
  if (filters.available !== undefined) query.available = filters.available === 'true' || filters.available === true;

  // Use cache if no specific filters applied (to simple optimize general fetches)
  const isCachable = Object.keys(query).length === 0;
  
  if (isCachable && menuCache && (Date.now() - cacheTimestamp < CACHE_TTL)) {
    return menuCache;
  }

  const items = await Menu.find(query).sort({ category: 1, name: 1 }).lean();
  
  if (isCachable) {
    menuCache = items;
    cacheTimestamp = Date.now();
  }
  
  return items;
};

/**
 * Retrieves a single menu item by its name using fuzzy/regex matching
 * @param {string} name - Name of the menu item
 * @returns {Promise<Object|null>}
 */
exports.getMenuItemByName = async (name) => {
  if (!name) return null;
  const normalized = name.toLowerCase().trim();
  
  // 1. Exact match
  let item = await Menu.findOne({ normalizedName: normalized, available: true });
  if (item) return item;

  // 2. Try stripping trailing 's' or 'es'
  const pluralStrip = normalized.replace(/e?s$/, '');
  item = await Menu.findOne({ normalizedName: new RegExp(`^${pluralStrip}`, 'i'), available: true });
  if (item) return item;
  
  // 3. Try removing spaces and comparing
  const noSpace = normalized.replace(/\s+/g, '');
  item = await Menu.findOne({ normalizedName: new RegExp(noSpace, 'i'), available: true });
  if (item) return item;

  // 4. Try regex partial match
  item = await Menu.findOne({ normalizedName: new RegExp(normalized, 'i'), available: true });
  return item;
};

/**
 * Creates a new menu item
 * @param {Object} data - Menu item data
 * @returns {Promise<Object>}
 */
exports.createMenuItem = async (data) => {
  const normalizedName = data.name.toLowerCase().trim();
  const exists = await Menu.findOne({ normalizedName });
  if (exists) {
    const error = new Error('Menu item already exists');
    error.statusCode = 409;
    throw error;
  }
  
  const newItem = new Menu(data);
  await newItem.save();
  
  // Invalidate cache
  menuCache = null;
  
  return newItem;
};
