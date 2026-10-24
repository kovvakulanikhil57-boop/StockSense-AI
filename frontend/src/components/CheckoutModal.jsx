import React, { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, CheckCircle2, AlertTriangle, MapPin, CreditCard, Banknote, ShieldAlert, Loader2 } from 'lucide-react';

export default function CheckoutModal({ isOpen, onClose, onOrderPlaced }) {
  const { items, totalAmount, clearCart, showToast } = useCart();
  const { user } = useAuth();

  const [deliveryLocation, setDeliveryLocation] = useState(
    user?.departmentBlock ? `${user.departmentBlock} - Room ` : ''
  );
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!deliveryLocation.trim()) {
      setErrorMessage('Please specify your delivery room or department area.');
      return;
    }

    if (items.length === 0) {
      setErrorMessage('Your cart is empty.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: items.map(i => ({
          productId: i.product.product_id,
          quantity: i.quantity
        })),
        deliveryLocation: deliveryLocation.trim(),
        paymentMethod
      };

      const res = await api.orders.checkout(payload);

      if (res.success && res.order) {
        clearCart();
        showToast('Order confirmed! Directed to order tracking.', 'success');
        onClose();
        onOrderPlaced(res.order.orderId);
      }
    } catch (err) {
      console.error('Checkout error:', err);
      // Display exact server error message (e.g. "Only 5 units of 'X' are currently available.")
      setErrorMessage(err.message || 'Checkout failed. Please verify item stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg">Confirm Stationery Order</h3>
            <p className="text-xs text-sky-200 mt-0.5">
              Verified for: {user?.branchName || 'University Branch'} ({user?.branchCode})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Delivery Location Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              Department Delivery Location & Room No. <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
                placeholder="e.g. CSE Block - 1st Floor Lab 3, System 12"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/20 text-xs text-slate-800 outline-none transition-all"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Your designated branch delivery agent will hand-deliver your order to this location.
            </p>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Payment Option</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH_ON_DELIVERY')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'border-navy-600 bg-navy-50/50 ring-1 ring-navy-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Cash on Delivery</div>
                  <div className="text-[10px] text-slate-500">Pay delivery agent upon OTP confirmation</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('SIMULATED_ONLINE')}
                className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all ${
                  paymentMethod === 'SIMULATED_ONLINE'
                    ? 'border-navy-600 bg-navy-50/50 ring-1 ring-navy-600'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-xs font-bold text-slate-900">Simulated Online</div>
                  <div className="text-[10px] text-slate-500">Instant test demo payment authorization</div>
                </div>
              </button>
            </div>
          </div>

          {/* Items Summary */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="text-xs font-bold text-slate-700">Order Items Review ({items.length} products)</div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-xs divide-y divide-slate-100">
              {items.map(({ product, quantity }) => (
                <div key={product.product_id} className="pt-1 flex justify-between text-slate-700">
                  <span className="truncate pr-2">{quantity}x {product.name}</span>
                  <span className="font-semibold shrink-0">₹{(parseFloat(product.price) * quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-slate-900 text-sm">
              <span>Payable Total:</span>
              <span className="text-navy-900 text-base">₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 font-semibold text-xs text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Reserving Stock...</span>
                </>
              ) : (
                <span>Confirm & Place Order</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
