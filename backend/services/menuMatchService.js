// services/menuMatchService.js
const Menu = require('../models/Menu');

exports.matchItemsToMenu = async (parsedEntities) => {
  const resolved = [];
  const notFound = [];
  const unavailable = [];

  for (const entity of parsedEntities) {
    const term = entity.entityText.toLowerCase().trim();
    if (!term) continue;

    let item = null;
    
    // 1. Exact Match on normalizedName
    item = await Menu.findOne({ normalizedName: term });
    
    // 2. Partial Match Regex
    if (!item) {
      item = await Menu.findOne({ normalizedName: { $regex: term, $options: 'i' } });
    }
    
    // 3. Strip plural suffixes and match
    if (!item && term.endsWith('s')) {
       const stripped = term.replace(/es$|s$/, '');
       item = await Menu.findOne({ normalizedName: { $regex: stripped, $options: 'i' } });
    }
    
    // 4. Word-by-word fallback inside the category matches
    if (!item) {
       const words = term.split(' ').filter(w => w.length > 2);
       for (const w of words) {
         item = await Menu.findOne({ normalizedName: { $regex: w, $options: 'i' } });
         if (item) break;
       }
    }

    if (!item) {
      notFound.push(entity.entityText);
    } else if (!item.available) {
      unavailable.push(item.name);
    } else {
      const existing = resolved.find(r => r.menuItemId.toString() === item._id.toString());
      if (existing) {
        existing.quantity += entity.quantity;
        existing.totalPrice = existing.quantity * existing.unitPrice;
      } else {
        resolved.push({
          menuItemId: item._id,
          name: item.name,
          quantity: entity.quantity,
          unitPrice: item.price,
          totalPrice: item.price * entity.quantity
        });
      }
    }
  }

  return { resolved, notFound, unavailable };
};
