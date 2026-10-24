import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import OTPVerificationModal from '../components/OTPVerificationModal';
import {
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Package,
  MapPin,
  Phone,
  KeyRound,
  RefreshCw,
  Send,
  AlertOctagon,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

export default function AgentDashboard() {
  const { user } = useAuth();
  const { showToast } = useCart();

  const [orders, setOrders] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [otpModalOrder, setOtpModalOrder] = useState(null);
  const [declineModalOrder, setDeclineModalOrder] = useState(null);
  const [declineReason, setDeclineReason] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const fetchAgentData = async () => {
    setLoading(true);
    try {
      const [ordersRes, warningsRes] = await Promise.all([
        api.delivery.getOrders(),
        api.delivery.getWarnings()
      ]);

      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (warningsRes.success) setWarnings(warningsRes.warnings || []);
    } catch (err) {
      console.error('Failed to load agent dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
    const interval = setInterval(fetchAgentData, 8000); // Polling for incoming branch orders
    return () => clearInterval(interval);
  }, []);

  // Handle Accept
  const handleAccept = async (orderId) => {
    setProcessingId(orderId);
    try {
      const res = await api.delivery.accept(orderId);
      if (res.success) {
        showToast(res.message || 'Order accepted.', 'success');
        fetchAgentData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to accept order.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Decline
  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    if (!declineReason.trim()) {
      showToast('Please specify a decline reason.', 'error');
      return;
    }

    setProcessingId(declineModalOrder.order_id);
    try {
      const res = await api.delivery.decline(declineModalOrder.order_id, declineReason.trim());
      if (res.success) {
        showToast(res.message || 'Order declined.', 'info');
        setDeclineModalOrder(null);
        setDeclineReason('');
        fetchAgentData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to decline order.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle Dispatch (Out for Delivery)
  const handleDispatch = async (orderId) => {
    setProcessingId(orderId);
    try {
      const res = await api.delivery.dispatch(orderId);
      if (res.success) {
        showToast(res.message || 'Order marked out for delivery. OTP generated.', 'success');
        fetchAgentData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to dispatch order.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // Filter orders by tab
  const pendingOrders = orders.filter(o => o.order_status === 'PENDING');
  const acceptedOrders = orders.filter(o => o.order_status === 'ACCEPTED');
  const dispatchedOrders = orders.filter(o => o.order_status === 'OUT_FOR_DELIVERY');
  const deliveredOrders = orders.filter(o => o.order_status === 'DELIVERED');

  const activeWarnings = warnings.filter(w => w.status === 'ACTIVE');

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Branch Header Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
            <Truck className="w-3.5 h-3.5" />
            <span>Designated Branch Delivery Agent</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black">
            {user?.branchName} ({user?.branchCode})
          </h1>
          <p className="text-xs text-slate-300 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-sky-400" />
            <span>Assigned Department Block: {user?.departmentBlock}</span>
            {user?.vehicleNumber && <span>• Vehicle: {user.vehicleNumber}</span>}
          </p>
        </div>

        <button
          onClick={fetchAgentData}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-2 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Board</span>
        </button>
      </div>

      {/* DISCIPLINARY WARNING ALERT BANNER */}
      {activeWarnings.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-amber-900 shadow-md space-y-2">
          <div className="flex items-center gap-2.5 font-extrabold text-sm text-amber-900">
            <AlertOctagon className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Administrative Notice: Active Delivery Warning ({activeWarnings.length})</span>
          </div>
          <div className="divide-y divide-amber-200/60 text-xs">
            {activeWarnings.map(w => (
              <div key={w.warning_id} className="pt-2 pb-1 space-y-1">
                <div className="font-bold text-amber-950">
                  Reason: {w.reason}
                </div>
                <div className="text-[11px] text-amber-800">
                  Issued on {new Date(w.created_at).toLocaleString()} by {w.issued_by_name} {w.order_number ? `• Order #${w.order_number}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage Counter Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-2 rounded-xl transition-all ${activeTab === 'ALL' ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${activeTab === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}
        >
          <span>Incoming Requests</span>
          <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-black">
            {pendingOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('ACCEPTED')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${activeTab === 'ACCEPTED' ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-800 hover:bg-blue-100'}`}
        >
          <span>Ready for Pickup</span>
          <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-black">
            {acceptedOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('OUT_FOR_DELIVERY')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${activeTab === 'OUT_FOR_DELIVERY' ? 'bg-purple-600 text-white' : 'bg-purple-50 text-purple-800 hover:bg-purple-100'}`}
        >
          <span>Out for Delivery (Enter OTP)</span>
          <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-black">
            {dispatchedOrders.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('DELIVERED')}
          className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all ${activeTab === 'DELIVERED' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
        >
          <span>Completed Deliveries</span>
          <span className="w-4 h-4 rounded-full bg-black/20 text-[10px] flex items-center justify-center font-black">
            {deliveredOrders.length}
          </span>
        </button>
      </div>

      {/* Orders Grid */}
      {loading && orders.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-white rounded-2xl border border-slate-200 animate-pulse p-5"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(activeTab === 'ALL'
            ? orders
            : activeTab === 'PENDING'
            ? pendingOrders
            : activeTab === 'ACCEPTED'
            ? acceptedOrders
            : activeTab === 'OUT_FOR_DELIVERY'
            ? dispatchedOrders
            : deliveredOrders
          ).map(order => (
            <div
              key={order.order_id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              {/* Order Header */}
              <div className="space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-extrabold text-navy-950">{order.order_number}</span>
                    <div className="text-[11px] text-slate-400">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    order.order_status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                    order.order_status === 'ACCEPTED' ? 'bg-blue-100 text-blue-800' :
                    order.order_status === 'OUT_FOR_DELIVERY' ? 'bg-purple-100 text-purple-800 animate-pulse' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {order.order_status.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Recipient & Location */}
                <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="font-bold text-slate-900 flex items-center justify-between">
                    <span>{order.student_name}</span>
                    {order.student_phone && (
                      <a href={`tel:${order.student_phone}`} className="text-sky-700 flex items-center gap-1 hover:underline">
                        <Phone className="w-3 h-3" />
                        <span>{order.student_phone}</span>
                      </a>
                    )}
                  </div>
                  <div className="text-slate-600 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-sky-600 shrink-0 mt-0.5" />
                    <span className="font-medium">{order.delivery_location}</span>
                  </div>
                </div>

                {/* Items preview */}
                <div className="space-y-1 text-xs">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Stationery Items:</span>
                  <div className="max-h-24 overflow-y-auto space-y-1 text-slate-700 divide-y divide-slate-100">
                    {order.items?.map((it, idx) => (
                      <div key={idx} className="pt-1 flex justify-between text-[11px]">
                        <span className="truncate pr-2">{it.quantity}x {it.product_name}</span>
                        <span className="font-mono text-slate-500 font-semibold shrink-0">₹{parseFloat(it.line_total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions based on State */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="text-slate-500 font-medium">Order Total:</span>
                  <span className="font-black text-navy-950 text-sm">₹{parseFloat(order.total_amount).toFixed(2)}</span>
                </div>

                {order.order_status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setDeclineModalOrder(order);
                        setDeclineReason('');
                      }}
                      disabled={processingId === order.order_id}
                      className="px-3 py-2 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-colors"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(order.order_id)}
                      disabled={processingId === order.order_id}
                      className="flex-1 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold shadow-sm transition-all"
                    >
                      Accept Delivery
                    </button>
                  </div>
                )}

                {order.order_status === 'ACCEPTED' && (
                  <button
                    onClick={() => handleDispatch(order.order_id)}
                    disabled={processingId === order.order_id}
                    className="w-full py-2.5 rounded-xl bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Pick Up & Mark Out for Delivery</span>
                  </button>
                )}

                {order.order_status === 'OUT_FOR_DELIVERY' && (
                  <button
                    onClick={() => setOtpModalOrder(order)}
                    className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all animate-pulse"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Enter Student OTP & Complete</span>
                  </button>
                )}

                {order.order_status === 'DELIVERED' && (
                  <div className="text-xs text-emerald-700 font-semibold flex items-center justify-between bg-emerald-50 p-2.5 rounded-xl">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Delivered Successfully</span>
                    </span>
                    {order.delivery_duration_minutes !== null && (
                      <span className="text-[11px] font-mono font-bold">
                        {order.delivery_duration_minutes} mins
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decline Modal */}
      {declineModalOrder && (
        <div className="fixed inset-0 z-50 bg-navy-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-slate-900">
              Decline Order #{declineModalOrder.order_number}
            </h3>
            <p className="text-xs text-slate-500">
              Declining this order will alert the store administrator for reassignment. Please provide a mandatory reason.
            </p>

            <textarea
              required
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Currently handling heavy bulk lab delivery in Block A / Vehicle flat tire..."
              className="w-full p-3 rounded-xl border border-slate-300 text-xs focus:border-navy-600 outline-none"
            />

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setDeclineModalOrder(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeclineSubmit}
                disabled={!declineReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold disabled:opacity-50"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTP Verification Modal */}
      <OTPVerificationModal
        isOpen={Boolean(otpModalOrder)}
        order={otpModalOrder}
        onClose={() => setOtpModalOrder(null)}
        onSuccess={(msg) => {
          showToast(msg, 'success');
          fetchAgentData();
        }}
      />
    </div>
  );
}
