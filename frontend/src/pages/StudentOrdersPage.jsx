import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import {
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  XCircle,
  KeyRound,
  MapPin,
  ChevronRight,
  RefreshCw,
  Phone,
  Ban
} from 'lucide-react';

export default function StudentOrdersPage() {
  const { showToast } = useCart();
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.orders.getMyOrders();
      if (res.success) {
        setOrders(res.orders || []);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000); // Polling for delivery updates
    return () => clearInterval(interval);
  }, []);

  const viewOrderDetails = async (orderId) => {
    setDetailsLoading(true);
    try {
      const res = await api.orders.getById(orderId);
      if (res.success && res.order) {
        setSelectedOrder(res.order);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load order details.', 'error');
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Stock will be restored to inventory.')) {
      return;
    }

    setCancelling(true);
    try {
      const res = await api.orders.cancel(orderId, 'Cancelled by student');
      if (res.success) {
        showToast(res.message || 'Order cancelled successfully.', 'success');
        fetchOrders();
        if (selectedOrder?.order_id === orderId) {
          viewOrderDetails(orderId);
        }
      }
    } catch (err) {
      showToast(err.message || 'Failed to cancel order.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { label: 'Order Placed', bg: 'bg-amber-100 text-amber-800 border-amber-300', icon: <Clock className="w-3 h-3" /> },
      ACCEPTED: { label: 'Agent Preparing', bg: 'bg-blue-100 text-blue-800 border-blue-300', icon: <Package className="w-3 h-3" /> },
      OUT_FOR_DELIVERY: { label: 'Out for Delivery', bg: 'bg-purple-100 text-purple-800 border-purple-300 animate-pulse', icon: <Truck className="w-3 h-3" /> },
      DELIVERED: { label: 'Delivered', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: <CheckCircle2 className="w-3 h-3" /> },
      CANCELLED: { label: 'Cancelled', bg: 'bg-slate-100 text-slate-600 border-slate-300', icon: <XCircle className="w-3 h-3" /> }
    };

    const c = config[status] || { label: status, bg: 'bg-slate-100 text-slate-800', icon: null };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.bg}`}>
        {c.icon}
        <span>{c.label}</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-950">My Stationery Orders</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time delivery progress and secure OTP verification codes for hand-delivery.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Orders List */}
        <div className="lg:col-span-1 space-y-3">
          {loading && orders.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse p-4"></div>
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-slate-700 text-sm">No orders yet</h3>
              <p className="text-xs text-slate-400">Your completed and pending orders will appear here.</p>
            </div>
          ) : (
            orders.map(order => {
              const isSelected = selectedOrder?.order_id === order.order_id;
              return (
                <div
                  key={order.order_id}
                  onClick={() => viewOrderDetails(order.order_id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-navy-600 bg-navy-50/40 shadow-md ring-1 ring-navy-600'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-xs text-navy-950">{order.order_number}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    {getStatusBadge(order.order_status)}
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">
                      {order.items_count} item{order.items_count > 1 ? 's' : ''} • {order.branch_code}
                    </span>
                    <span className="font-black text-navy-900 text-sm">
                      ₹{parseFloat(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Order Details & OTP Card */}
        <div className="lg:col-span-2">
          {detailsLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 animate-pulse">
              Loading order details...
            </div>
          ) : selectedOrder ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-6 p-6">
              
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-extrabold text-navy-950">{selectedOrder.order_number}</h2>
                    {getStatusBadge(selectedOrder.order_status)}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Placed on {new Date(selectedOrder.created_at).toLocaleString()} • {selectedOrder.branch_name}
                  </p>
                </div>

                {['PENDING', 'ACCEPTED'].includes(selectedOrder.order_status) && (
                  <button
                    disabled={cancelling}
                    onClick={() => handleCancelOrder(selectedOrder.order_id)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Cancel Order</span>
                  </button>
                )}
              </div>

              {/* SECURE DELIVERY OTP PROMINENT CARD (When Out For Delivery) */}
              {selectedOrder.deliveryOtp && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-navy-900 via-navy-800 to-sky-950 text-white border-2 border-sky-400/50 shadow-xl space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-300 flex items-center justify-center">
                        <KeyRound className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-white">Your Delivery Verification OTP</h3>
                        <p className="text-[11px] text-sky-200">Required by the agent to hand over items</p>
                      </div>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                      Active
                    </span>
                  </div>

                  <div className="bg-black/30 rounded-xl p-4 text-center border border-white/10">
                    <div className="font-mono text-3xl sm:text-4xl font-black tracking-[0.4em] text-sky-300 select-all">
                      {selectedOrder.deliveryOtp}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-300 text-center">
                    🔒 For security, this OTP is stored as an encrypted cryptographic hash and only decrypted for your session. Do not share it until the agent arrives at your room.
                  </p>
                </div>
              )}

              {/* Delivery Agent Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Delivery Destination</span>
                  <div className="flex items-start gap-2 text-xs font-semibold text-slate-800">
                    <MapPin className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                    <span>{selectedOrder.delivery_location}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">Department Block: {selectedOrder.department_block}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Delivery Agent</span>
                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <Truck className="w-4 h-4 text-navy-700 shrink-0" />
                    <span>{selectedOrder.agent_name || 'Designated Branch Agent'}</span>
                  </div>
                  {selectedOrder.agent_phone && (
                    <div className="flex items-center gap-1.5 text-xs text-sky-800 font-medium">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{selectedOrder.agent_phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Ordered Items</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrder.items?.map(item => (
                    <div key={item.order_item_id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-slate-900">{item.product_name}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">SKU: {item.sku} • Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-extrabold text-navy-950">₹{item.line_total.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-400">₹{item.unit_price.toFixed(2)} each</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Summary */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Payment Method:</span>
                  <span className="font-semibold text-slate-800">{selectedOrder.payment_method.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Status:</span>
                  <span className="font-semibold text-slate-800">{selectedOrder.payment_status}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-extrabold text-sm text-slate-900">
                  <span>Total Amount Paid / Due:</span>
                  <span className="text-navy-900 text-base">₹{selectedOrder.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 space-y-2">
              <Package className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="font-semibold text-slate-700">Select an order from the list</div>
              <div className="text-xs">Detailed items and active Delivery Verification OTP will appear here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
