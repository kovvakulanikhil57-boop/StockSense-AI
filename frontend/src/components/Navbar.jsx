import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import {
  ShoppingBag,
  Bell,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Truck,
  ShieldCheck,
  Package,
  ClipboardList,
  AlertTriangle,
  History,
  CheckCheck
} from 'lucide-react';

export default function Navbar({ onNavigate, currentPage }) {
  const { user, isAuthenticated, logout, isStudent, isAgent, isAdmin } = useAuth();
  const { totalItems, setIsCartOpen } = useCart();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notifRef = useRef(null);
  const userMenuRef = useRef(null);

  // Poll notifications periodically
  useEffect(() => {
    let isMounted = true;

    async function fetchNotifications() {
      if (!isAuthenticated) return;
      try {
        const res = await api.notifications.getAll();
        if (res.success && isMounted) {
          setNotifications(res.notifications || []);
          setUnreadCount(res.unreadCount || 0);
        }
      } catch (err) {
        // Silently catch polling errors
      }
    }

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getBranchBadge = () => {
    if (!user?.branchCode) return null;
    const styles = {
      '05': 'bg-blue-100 text-blue-800 border-blue-300',
      '66': 'bg-purple-100 text-purple-800 border-purple-300',
      '67': 'bg-teal-100 text-teal-800 border-teal-300'
    };
    const names = {
      '05': 'CSE Core',
      '66': 'CSM AIML',
      '67': 'CSD Data Science'
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[user.branchCode] || 'bg-slate-100 text-slate-800'}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
        {names[user.branchCode] || `Branch ${user.branchCode}`}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-40 glass-header border-b border-slate-200 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate(isAgent ? 'agent-dashboard' : isAdmin ? 'admin-dashboard' : 'storefront')}
            className="flex items-center gap-3 text-left focus:outline-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-navy-900 to-navy-700 text-white flex items-center justify-center font-bold text-lg shadow-md group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-navy-950 tracking-tight text-lg">StockSense</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 font-bold tracking-wide uppercase border border-sky-500/20">AI</span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block font-medium">University Stationery & Delivery</p>
            </div>
          </button>

          {/* Logged in User's Branch Tag */}
          {getBranchBadge()}
          {isAdmin && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-sky-300 border border-slate-700 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Admin Portal</span>
            </span>
          )}
        </div>

        {/* Center Navigation Links (Public Store & Delivery Agent) */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
          {(!isAuthenticated || isStudent) && (
            <>
              <button
                onClick={() => onNavigate('storefront')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${currentPage === 'storefront' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'}`}
              >
                Stationery Store
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => onNavigate('student-orders')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${currentPage === 'student-orders' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'}`}
                >
                  My Orders
                </button>
              )}
            </>
          )}

          {isAgent && (
            <>
              <button
                onClick={() => onNavigate('agent-dashboard')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${currentPage === 'agent-dashboard' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'}`}
              >
                Branch Delivery Board
              </button>
              <button
                onClick={() => onNavigate('agent-warnings')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${currentPage === 'agent-warnings' ? 'bg-navy-900 text-white font-semibold' : 'text-slate-600 hover:text-navy-900 hover:bg-slate-100'}`}
              >
                SLA & Warnings
              </button>
            </>
          )}
        </nav>

        {/* Right Action Icons & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Cart Icon (only for student or guest) */}
          {(!isAuthenticated || isStudent) && (
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-slate-700 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
              title="View Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 bg-navy-700 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm animate-pulse">
                  {totalItems}
                </span>
              )}
            </button>
          )}

          {/* Notifications Popover */}
          {isAuthenticated && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative p-2 text-slate-700 hover:text-navy-900 hover:bg-slate-100 rounded-xl transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2 font-semibold text-sm">
                      <Bell className="w-4 h-4 text-sky-400" />
                      <span>Notifications ({unreadCount} new)</span>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-sky-300 hover:text-white flex items-center gap-1 font-medium transition-colors"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-sm text-slate-400">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.notification_id}
                          className={`p-3.5 text-xs transition-colors ${n.is_read ? 'bg-white text-slate-600' : 'bg-sky-50/70 text-slate-900 font-medium'}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-navy-900">{n.title}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User Profile / Login Button */}
          {isAuthenticated ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1.5 pl-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-navy-800 text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-semibold text-navy-950 truncate max-w-[120px]">{user.name}</div>
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{user.role}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 text-sm">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{user.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user.email}</p>
                    {user.departmentBlock && (
                      <p className="text-[11px] text-sky-700 font-medium mt-1 truncate">
                        📍 {user.departmentBlock}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onNavigate('profile');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>My Profile & Password</span>
                  </button>

                  <div className="my-1 border-t border-slate-100"></div>

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                      onNavigate('storefront');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-rose-50 text-rose-600 flex items-center gap-2.5 font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-3.5 py-1.5 text-sm font-semibold text-navy-900 hover:text-navy-950 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('register')}
                className="px-3.5 py-1.5 text-sm font-semibold text-white bg-navy-900 hover:bg-navy-800 rounded-xl shadow-sm transition-all"
              >
                Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
