import { useState, useCallback } from 'react';

export function useOrderState() {
  const [orderItems, setOrderItems] = useState([]);

  // Merges newly resolved items into the existing cart (accumulates quantities)
  const setResolvedItems = useCallback((resolvedArray) => {
    setOrderItems(prev => {
      const merged = [...prev];
      for (const newItem of resolvedArray) {
        const newId = String(newItem.menuItemId || newItem._id);
        const existing = merged.find(i => String(i.menuItemId || i._id) === newId);
        if (existing) {
          existing.quantity += newItem.quantity;
          existing.totalPrice = existing.quantity * existing.unitPrice;
        } else {
          merged.push({ ...newItem });
        }
      }
      return merged;
    });
  }, []);

  const addItem = useCallback((item) => {
    setOrderItems(prev => {
      const id = item.menuItemId || item._id;
      const existing = prev.find(i => (i.menuItemId || i._id) === id);
      if (existing) {
        return prev.map(i =>
          (i.menuItemId || i._id) === id
            ? { ...i, quantity: i.quantity + 1, totalPrice: (i.quantity + 1) * i.unitPrice }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, totalPrice: item.unitPrice }];
    });
  }, []);

  const updateQuantity = useCallback((id, delta) => {
    setOrderItems(prev => prev.map(item => {
      const targetId = item.menuItemId || item._id;
      if (targetId === id) {
        let newQty = item.quantity + delta;
        newQty = Math.max(0, newQty);
        return { 
          ...item, 
          quantity: newQty,
          totalPrice: newQty * item.unitPrice
        };
      }
      return item;
    }).filter(item => item.quantity > 0)); 
  }, []);

  const removeItem = useCallback((id) => {
    setOrderItems(prev => prev.filter(item => (item.menuItemId || item._id) !== id));
  }, []);

  const clearOrder = useCallback(() => {
    setOrderItems([]);
  }, []);

  return {
    orderItems,
    setResolvedItems,
    addItem,
    updateQuantity,
    removeItem,
    clearOrder
  };
}
