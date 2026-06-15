// services/billingService.js

/**
 * Calculates tax and totals for resolved order items
 * @param {Array} resolvedItems - Array of resolved item objects
 * @param {number} gstRate - GST Rate applied to the total
 * @returns {Object} Calculated billing details
 */
exports.calculateBill = (resolvedItems, gstRate) => {
  const items = resolvedItems.map(item => ({
    ...item,
    totalPrice: item.unitPrice * item.quantity
  }));

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = Math.round(subtotal * gstRate * 100) / 100;
  const grandTotal = Math.round((subtotal + taxAmount) * 100) / 100;

  return {
    items,
    subtotal,
    gstRate,
    taxAmount,
    grandTotal
  };
};
