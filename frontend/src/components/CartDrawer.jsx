import React from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';

export default function CartDrawer({ onProceedToCheckout }) {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, clearCart, totalAmount, totalItems } = useCart();
  const { user } = useAuth();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-navy-800" />
              <h2 className="font-bold text-slate-900 text-lg">Your Stationery Cart</h2>
              <span className="text-xs bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full font-semibold">
                {totalItems} items
              </span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User branch indicator */}
          {user?.branchName && (
            <div className="px-5 py-2 bg-sky-50/60 border-b border-sky-100 text-xs text-sky-800 flex items-center justify-between">
              <span>Verified Branch Delivery:</span>
              <span className="font-semibold">{user.branchName} ({user.branchCode})</span>
            </div>
          )}

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
                  <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h3 className="font-bold text-slate-700">Your cart is empty</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Add lab records, bond sheets, notebooks, or branch-specific reference guides to get started.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-2 text-xs font-semibold text-navy-800 hover:underline"
                >
                  Continue Shopping
                </button>
              </div>
            ) : (
              items.map(({ product, quantity }) => (
                <div
                  key={product.product_id}
                  className="p-3.5 rounded-xl border border-slate-200/90 hover:border-slate-300 bg-white transition-all shadow-sm space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-slate-900 truncate" title={product.name}>
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-slate-500">SKU: {product.sku}</span>
                        {product.category_name && (
                          <span className="text-[10px] text-slate-400">• {product.category_name}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromCart(product.product_id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                      <button
                        onClick={() => updateQuantity(product.product_id, quantity - 1)}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
                        title="Decrease"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2.5 text-xs font-bold text-slate-800">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.product_id, quantity + 1)}
                        disabled={quantity >= product.stock_quantity}
                        className="px-2 py-1 text-slate-600 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Increase"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">₹{parseFloat(product.price).toFixed(2)} × {quantity}</div>
                      <div className="text-xs font-black text-navy-950">
                        ₹{(parseFloat(product.price) * quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer & Checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/80 space-y-3">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">₹{totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Department Delivery</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-extrabold text-slate-900">
                  <span>Estimated Total</span>
                  <span className="text-base text-navy-900">₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={clearCart}
                  className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    onProceedToCheckout();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
