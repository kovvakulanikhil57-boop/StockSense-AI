import React, { useState } from 'react';
import { api } from '../services/api';
import { X, KeyRound, ShieldAlert, Loader2, CheckCircle2 } from 'lucide-react';

export default function OTPVerificationModal({ order, isOpen, onClose, onSuccess }) {
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!otp || otp.trim().length !== 6) {
      setError('Please enter the full 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.delivery.verifyOtp(order.order_id, otp.trim());
      if (res.success) {
        onSuccess(res.message || 'Delivery successfully completed!');
        onClose();
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-sky-300" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Verify Delivery OTP</h3>
              <p className="text-xs text-sky-200">Order #{order.order_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3 text-xs text-sky-900 space-y-1">
            <div className="font-semibold">Recipient: {order.student_name}</div>
            <div className="text-sky-700">📍 {order.delivery_location}</div>
            <p className="text-[11px] text-sky-600 pt-1">
              Ask the student for their 6-digit verification code visible in their authenticated order details.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-1.5 text-center">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Enter 6-Digit Delivery Code
            </label>
            <input
              type="text"
              maxLength={6}
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-48 mx-auto tracking-[0.5em] text-center font-mono text-2xl font-black py-2.5 px-3 rounded-xl border-2 border-navy-200 focus:border-navy-600 focus:ring-4 focus:ring-navy-600/10 outline-none transition-all text-navy-950"
            />
            <p className="text-[11px] text-slate-400">Attempts are strictly logged on the server.</p>
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
              disabled={isSubmitting || otp.length !== 6}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Complete Delivery</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
