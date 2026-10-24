import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertOctagon, CheckCircle2, Clock, ShieldCheck, RefreshCw } from 'lucide-react';

export default function AgentWarningsPage() {
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWarnings = async () => {
    setLoading(true);
    try {
      const res = await api.delivery.getWarnings();
      if (res.success) {
        setWarnings(res.warnings || []);
      }
    } catch (err) {
      console.error('Failed to load warnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarnings();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy-950">Delivery SLA & Disciplinary Notices</h1>
          <p className="text-xs text-slate-500 mt-1">
            Official administrative logs regarding delivery delays, order declines, or protocol reviews.
          </p>
        </div>
        <button
          onClick={fetchWarnings}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading notices...</div>
      ) : warnings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">Exemplary Standing</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You have no active or historical disciplinary warnings. All assigned branch deliveries comply with institutional SLA policies.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {warnings.map(w => (
            <div
              key={w.warning_id}
              className={`p-5 rounded-2xl border shadow-sm transition-all ${
                w.status === 'ACTIVE'
                  ? 'border-amber-300 bg-amber-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-xl shrink-0 ${w.status === 'ACTIVE' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                    <AlertOctagon className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-slate-900">{w.reason}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${w.status === 'ACTIVE' ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-600'}`}>
                        {w.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Issued by {w.issued_by_name} on {new Date(w.created_at).toLocaleString()}
                      {w.order_number && ` • Order #${w.order_number}`}
                    </p>
                  </div>
                </div>
              </div>

              {w.status === 'RESOLVED' && w.resolution_notes && (
                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-emerald-800 bg-emerald-50/60 p-3 rounded-xl">
                  <span className="font-bold">Resolution Notes: </span>
                  <span>{w.resolution_notes}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
