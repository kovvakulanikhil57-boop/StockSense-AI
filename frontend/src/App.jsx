import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import CheckoutModal from './components/CheckoutModal';
import Toast from './components/Toast';

// Pages
import StudentStorefront from './pages/StudentStorefront';
import StudentOrdersPage from './pages/StudentOrdersPage';
import AgentDashboard from './pages/AgentDashboard';
import AgentWarningsPage from './pages/AgentWarningsPage';
import AdminDashboard from './pages/AdminDashboard';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';

function MainApp() {
  const { user, isAuthenticated, isAgent, isAdmin } = useAuth();
  const { notification } = useCart();

  const [currentPage, setCurrentPage] = useState(() => {
    return 'storefront';
  });

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOrderPlaced = (orderId) => {
    setCurrentPage('student-orders');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between selection:bg-navy-900 selection:text-white">
      <div>
        {/* Navigation Bar */}
        <Navbar onNavigate={handleNavigate} currentPage={currentPage} />

        {/* Main Content Viewport */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          {currentPage === 'storefront' && <StudentStorefront />}
          {currentPage === 'student-orders' && <StudentOrdersPage />}
          {currentPage === 'agent-dashboard' && <AgentDashboard />}
          {currentPage === 'agent-warnings' && <AgentWarningsPage />}
          
          {currentPage === 'admin-dashboard' && <AdminDashboard initialTab="overview" onNavigate={handleNavigate} />}
          {currentPage === 'admin-products' && <AdminDashboard initialTab="products" onNavigate={handleNavigate} />}
          {currentPage === 'admin-orders' && <AdminDashboard initialTab="orders" onNavigate={handleNavigate} />}
          {currentPage === 'admin-sla' && <AdminDashboard initialTab="sla" onNavigate={handleNavigate} />}
          {currentPage === 'admin-agents' && <AdminDashboard initialTab="agents" onNavigate={handleNavigate} />}
          {currentPage === 'admin-users' && <AdminDashboard initialTab="users" onNavigate={handleNavigate} />}
          {currentPage === 'admin-audit' && <AdminDashboard initialTab="audit" onNavigate={handleNavigate} />}

          {currentPage === 'login' && <LoginPage onNavigate={handleNavigate} />}
          {currentPage === 'register' && <RegisterPage onNavigate={handleNavigate} />}
          {currentPage === 'profile' && <ProfilePage />}
        </main>
      </div>

      {/* Cart Drawer */}
      <CartDrawer onProceedToCheckout={() => setIsCheckoutOpen(true)} />

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOrderPlaced={handleOrderPlaced}
      />

      {/* Floating Global Toast */}
      <Toast notification={notification} />

      {/* Academic Institutional Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-navy-950">StockSense AI</span>
            <span>•</span>
            <span>University Stationery Store & Branch Delivery System</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold border border-blue-200">CSE (05)</span>
            <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">CSM (66)</span>
            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-700 font-bold border border-teal-200">CSD (67)</span>
          </div>

          <div className="text-slate-400">
            © {new Date().getFullYear()} VNR VJIET Campus Services. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <MainApp />
      </CartProvider>
    </AuthProvider>
  );
}
