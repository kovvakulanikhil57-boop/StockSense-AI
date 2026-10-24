import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Package, Lock, Mail, ArrowRight, ShieldAlert, Sparkles, UserCheck, Truck, Shield } from 'lucide-react';

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const { showToast } = useCart();

  const [roleTab, setRoleTab] = useState('STUDENT'); // 'STUDENT' | 'DELIVERY_AGENT' | 'ADMIN'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await login({ email: email.trim(), password }, roleTab);
      if (res.success) {
        showToast(res.message || 'Logged in successfully!', 'success');
        if (res.user.role === 'ADMIN') {
          onNavigate('admin-dashboard');
        } else if (res.user.role === 'DELIVERY_AGENT') {
          onNavigate('agent-dashboard');
        } else {
          onNavigate('storefront');
        }
      }
    } catch (err) {
      setErrorMessage(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = (demoEmail, demoPass, targetRole) => {
    setRoleTab(targetRole);
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4 sm:px-0">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center text-sky-400">
            <Package className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-black">StockSense AI Portal</h2>
          <p className="text-xs text-slate-300">
            Select your role and sign in with institutional credentials.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="grid grid-cols-3 p-2 bg-slate-100 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setRoleTab('STUDENT'); setErrorMessage(null); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'STUDENT' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>
          <button
            type="button"
            onClick={() => { setRoleTab('DELIVERY_AGENT'); setErrorMessage(null); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'DELIVERY_AGENT' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Agent</span>
          </button>
          <button
            type="button"
            onClick={() => { setRoleTab('ADMIN'); setErrorMessage(null); }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              roleTab === 'ADMIN' ? 'bg-white text-navy-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Admin</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Role-Specific Account Notice */}
          {roleTab === 'DELIVERY_AGENT' && (
            <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-sky-900">
                <Truck className="w-3.5 h-3.5 text-sky-700" />
                Administrative Account Provisioning
              </div>
              <p className="text-[11px] leading-relaxed text-sky-800">
                Delivery Agent accounts are provisioned and activated by the University Store Administrator in the Admin Dashboard (enforcing 1 active agent per academic branch). If you are newly assigned, sign in with your designated institutional email.
              </p>
            </div>
          )}

          {roleTab === 'ADMIN' && (
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-purple-900">
                <Shield className="w-3.5 h-3.5 text-purple-700" />
                Secure Administrator Access
              </div>
              <p className="text-[11px] leading-relaxed text-purple-800">
                The initial store administrator is bootstrapped via one-time backend CLI command (<code className="bg-purple-100 px-1 py-0.5 rounded font-mono text-[10px]">npm run bootstrap:admin</code>). Subsequent admins are created by existing admins in the Executive Hub. Public admin registration is restricted.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              {roleTab === 'STUDENT'
                ? 'Student Institutional Email'
                : roleTab === 'DELIVERY_AGENT'
                ? 'Delivery Agent Email'
                : 'Admin Store Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.test"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Authenticating...' : `Sign In as ${roleTab.replace(/_/g, ' ')}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {roleTab === 'STUDENT' && (
            <div className="pt-2 text-center text-xs text-slate-500">
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="font-bold text-navy-800 hover:underline"
              >
                Register with college email
              </button>
            </div>
          )}

          {import.meta.env.DEV && (
            <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Development Testing Credentials</span>
                </div>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                DEV ONLY
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Pre-seeded development credentials for test automation and role verification.
            </p>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleFillDemo('admin@example.test', 'Demo-Admin-Only-2026!', 'ADMIN')}
                className="p-2 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 font-semibold text-left border border-purple-200"
              >
                ⚡ Store Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('demo.agent05@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT')}
                className="p-2 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-left border border-sky-200"
              >
                ⚡ CSE Agent (05)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('demo.agent66@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT')}
                className="p-2 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-left border border-sky-200"
              >
                ⚡ CSM Agent (66)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('demo.agent67@example.test', 'Demo-Agent-Only-2026!', 'DELIVERY_AGENT')}
                className="p-2 rounded-lg bg-sky-50 text-sky-800 hover:bg-sky-100 font-semibold text-left border border-sky-200"
              >
                ⚡ CSD Agent (67)
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('99071A0501@example.test', 'Demo-Student-Only-2026!', 'STUDENT')}
                className="p-2 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 font-semibold text-left border border-blue-200"
              >
                ⚡ CSE Student
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('99071A6605@example.test', 'Demo-Student-Only-2026!', 'STUDENT')}
                className="p-2 rounded-lg bg-indigo-50 text-indigo-800 hover:bg-indigo-100 font-semibold text-left border border-indigo-200"
              >
                ⚡ CSM Student
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('99075A6709@example.test', 'Demo-Student-Only-2026!', 'STUDENT')}
                className="col-span-2 p-2 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 font-semibold text-left border border-teal-200"
              >
                ⚡ CSD Lateral Entry Student
              </button>
            </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
