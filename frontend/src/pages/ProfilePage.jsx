import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import PasswordChecklist from '../components/PasswordChecklist';
import {
  User,
  Mail,
  Phone,
  Truck,
  Shield,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  MapPin,
  Building
} from 'lucide-react';

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const { showToast } = useCart();

  const [phone, setPhone] = useState(user?.phone || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.vehicleNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [passError, setPassError] = useState(null);

  const handleUpdateContact = async (e) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      const res = await api.auth.updateProfile({
        phone: phone.trim(),
        vehicleNumber: user?.role === 'DELIVERY_AGENT' ? vehicleNumber.trim() : undefined
      });
      if (res.success) {
        showToast('Contact details updated successfully.', 'success');
        refreshProfile();
      }
    } catch (err) {
      showToast(err.message || 'Failed to update profile.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPassError(null);

    if (newPassword !== confirmPassword) {
      setPassError('New passwords do not match.');
      return;
    }

    setIsChangingPass(true);
    try {
      const res = await api.auth.changePassword({
        currentPassword,
        newPassword
      });
      if (res.success) {
        showToast('Password changed successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPassError(err.message || 'Failed to change password.');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-navy-950">Account Profile & Security</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your verified academic credentials and update delivery contact information.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Profile Card & Contact Info */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white font-extrabold text-lg flex items-center justify-center">
              {user?.name ? user.name.charAt(0) : 'U'}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-navy-950">{user?.name}</h3>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Account Role:</span>
              <span className="font-bold text-navy-950">{user?.role}</span>
            </div>
            {user?.branchName && (
              <div className="flex justify-between">
                <span className="text-slate-500">Verified Branch:</span>
                <span className="font-bold text-sky-800">{user.branchName} ({user.branchCode})</span>
              </div>
            )}
            {user?.departmentBlock && (
              <div className="flex justify-between">
                <span className="text-slate-500">Department Block:</span>
                <span className="font-medium text-slate-700">{user.departmentBlock}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Verification Status:</span>
              <span className="font-bold text-emerald-700">Verified Institutional User</span>
            </div>
          </div>

          {/* Contact Details Form */}
          <form onSubmit={handleUpdateContact} className="space-y-3 text-xs pt-2">
            <div>
              <label className="font-bold text-slate-700">Phone Number (Delivery Notifications)</label>
              <div className="relative mt-1">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional phone number"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-navy-600"
                />
              </div>
            </div>

            {user?.role === 'DELIVERY_AGENT' && (
              <div>
                <label className="font-bold text-slate-700">Vehicle Number Plate</label>
                <div className="relative mt-1">
                  <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="TS 08 AB 1234"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 outline-none focus:border-navy-600 font-mono uppercase"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isUpdating}
              className="w-full py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isUpdating ? 'Saving...' : 'Update Contact Information'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-navy-800" />
            <h3 className="font-extrabold text-base text-navy-950">Update Account Password</h3>
          </div>
          <p className="text-xs text-slate-500">
            Enforces institutional complexity rules (8+ chars, upper, lower, number, special character).
          </p>

          <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
            {passError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold">
                {passError}
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600"
              />
            </div>

            <PasswordChecklist password={newPassword} />

            <button
              type="submit"
              disabled={isChangingPass || !newPassword}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm disabled:opacity-50 mt-2"
            >
              <span>{isChangingPass ? 'Updating...' : 'Change Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
