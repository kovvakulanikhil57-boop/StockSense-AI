import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import PasswordChecklist from '../components/PasswordChecklist';
import {
  User,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  GraduationCap,
  Sparkles
} from 'lucide-react';

export default function RegisterPage({ onNavigate }) {
  const { register } = useAuth();
  const { showToast } = useCart();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const institutionEmailDomain = (import.meta.env.VITE_INSTITUTION_EMAIL_DOMAIN || 'example.test').trim().toLowerCase();
  const escapedInstitutionEmailDomain = institutionEmailDomain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Live branch detection logic
  const detectedBranch = useMemo(() => {
    const trimmed = (email || '').trim().toLowerCase();
    const regex = new RegExp(
      `^([0-9]{2})07(1|5)A(05|66|67)([0-9A-Za-z]{2})@${escapedInstitutionEmailDomain}$`,
      'i'
    );
    const match = trimmed.match(regex);
    if (!match) return null;

    const code = match[3];
    const map = {
      '05': { code: '05', name: 'Computer Science and Engineering (CSE)', block: 'CSE Block - Ground Floor', color: 'bg-blue-100 text-blue-900 border-blue-300' },
      '66': { code: '66', name: 'Artificial Intelligence & Machine Learning (CSM)', block: 'CSM Block - 1st Floor', color: 'bg-purple-100 text-purple-900 border-purple-300' },
      '67': { code: '67', name: 'Data Science (CSD)', block: 'CSD Block - 2nd Floor', color: 'bg-teal-100 text-teal-900 border-teal-300' }
    };
    return map[code] || null;
  }, [email, escapedInstitutionEmailDomain]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!detectedBranch) {
      setError('Please provide a valid institutional email matching regular (YY071A...) or lateral (YY075A...) format.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        phone: phone.trim()
      });

      if (res.success) {
        showToast(res.message || 'Registration successful! Welcome.', 'success');
        onNavigate('storefront');
      }
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto py-8 px-4 sm:px-0">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Student Onboarding</span>
          </div>
          <h2 className="text-xl font-black">Register for University Stationery</h2>
          <p className="text-xs text-slate-300">
            Your branch is automatically detected and cryptographically locked based on your college roll number email.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Demo User"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">
              College Email ID <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. 99071A0501@example.test"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all font-mono"
              />
            </div>

            {/* LIVE BRANCH DETECTION FEEDBACK */}
            {detectedBranch ? (
              <div className={`mt-2 p-2.5 rounded-xl border flex items-start gap-2 text-xs animate-in fade-in ${detectedBranch.color}`}>
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold">Verified Branch: {detectedBranch.name}</div>
                  <div className="text-[11px] opacity-80">Department Block: {detectedBranch.block}</div>
                </div>
              </div>
            ) : email.trim().length > 4 ? (
              <p className="text-[11px] text-amber-600 font-medium pt-1">
                Pattern format required: Regular (<code>YY071A[05|66|67]xx@{institutionEmailDomain}</code>) or Lateral (<code>YY075A[05|66|67]xx@{institutionEmailDomain}</code>).
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Phone Number (For Delivery Contact)</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional phone number"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Password <span className="text-rose-500">*</span></label>
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

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700">Confirm Password <span className="text-rose-500">*</span></label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:border-navy-600 focus:ring-2 focus:ring-navy-600/10 outline-none transition-all"
              />
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[11px] text-rose-600 font-semibold pt-0.5">
                Passwords do not match.
              </p>
            )}
          </div>

          {/* LIVE PASSWORD REQUIREMENTS CHECKLIST */}
          <PasswordChecklist password={password} />

          <button
            type="submit"
            disabled={loading || !detectedBranch}
            className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 mt-3"
          >
            <span>{loading ? 'Registering...' : 'Complete Student Registration'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="pt-2 text-center text-xs text-slate-500">
            Already registered?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="font-bold text-navy-800 hover:underline"
            >
              Sign in to your account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
