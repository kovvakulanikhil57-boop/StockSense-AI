import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../services/api';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user, token, isStudent } = useAuth();
  const [items, setItems] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [loadingCart, setLoadingCart] = useState(false);
  const [notification, setNotification] = useState(null);

  const showToast = useCallback((message, type = 'info') => {
    setNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setNotification(prev => (prev?.id === prev?.id ? null : prev));
    }, 3500);
  }, []);

  // Fetch student's isolated cart from backend
  const fetchCart = useCallback(async () => {
    if (!token || !isStudent) {
      setItems([]);
      return;
    }

    try {
      setLoadingCart(true);
      const res = await api.cart.get();
      if (res.success && res.cart) {
        setItems(res.cart.items || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Failed to load student cart from server:', err.message);
      setItems([]);
    } finally {
      setLoadingCart(false);
    }
  }, [token, isStudent]);

  // Synchronize cart on authentication state change (login, logout, switch account)
  useEffect(() => {
    if (token && isStudent) {
      fetchCart();
    } else {
      // Immediately clear in-memory cart on logout or non-student user
      setItems([]);
    }
  }, [token, user?.user_id || user?.userId, isStudent, fetchCart]);

  const addToCart = async (product, quantity = 1) => {
    if (!token || !isStudent) {
      showToast('Please sign in as a student to add items to your cart.', 'warning');
      return false;
    }

    if (!product || product.stock_quantity <= 0) {
      showToast(`'${product?.name || 'Item'}' is currently out of stock.`, 'error');
      return false;
    }

    const requestedQty = parseInt(quantity, 10);
    if (isNaN(requestedQty) || requestedQty <= 0) {
      showToast('Please specify a valid quantity.', 'warning');
      return false;
    }

    try {
      const res = await api.cart.addItem({
        productId: product.product_id,
        quantity: requestedQty
      });

      if (res.success) {
        await fetchCart();
        showToast(`Added '${product.name}' to cart.`, 'success');
        return true;
      } else {
        showToast(res.message || 'Failed to add item to cart.', 'error');
        return false;
      }
    } catch (err) {
      showToast(err.message || 'Failed to add item to cart.', 'error');
      return false;
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!token || !isStudent) return;

    const qty = parseInt(newQuantity, 10);
    try {
      if (qty <= 0) {
        await removeFromCart(productId);
        return;
      }

      const res = await api.cart.updateQuantity(productId, qty);
      if (res.success) {
        await fetchCart();
      } else {
        showToast(res.message || 'Failed to update quantity.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to update quantity.', 'error');
    }
  };

  const removeFromCart = async (productId) => {
    if (!token || !isStudent) return;

    try {
      const res = await api.cart.removeItem(productId);
      if (res.success) {
        await fetchCart();
        showToast('Item removed from cart.', 'info');
      } else {
        showToast(res.message || 'Failed to remove item.', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove item.', 'error');
    }
  };

  const clearCart = async () => {
    if (token && isStudent) {
      try {
        await api.cart.clear();
      } catch (err) {
        console.warn('Clear cart server error:', err.message);
      }
    }
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => {
    const price = parseFloat(item.product?.price || item.unitPrice || 0);
    return sum + item.quantity * price;
  }, 0);

  const value = {
    items,
    isCartOpen,
    setIsCartOpen,
    loadingCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart,
    totalItems,
    totalAmount,
    notification,
    showToast
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
