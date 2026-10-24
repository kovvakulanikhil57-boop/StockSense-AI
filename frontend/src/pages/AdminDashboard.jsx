import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useCart } from '../context/CartContext';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import {
  Package,
  Users,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Plus,
  RefreshCw,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  ClipboardList,
  Layers,
  ArrowUpRight,
  UserCheck,
  Search,
  History,
  FileText,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export default function AdminDashboard({ initialTab = 'overview', onNavigate }) {
  const { showToast } = useCart();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Keep internal tab in sync if initialTab prop changes externally
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setIsMobileNavOpen(false);
    if (onNavigate) {
      const routeMap = {
        overview: 'admin-dashboard',
        products: 'admin-products',
        orders: 'admin-orders',
        sla: 'admin-sla',
        agents: 'admin-agents',
        users: 'admin-users',
        audit: 'admin-audit'
      };
      if (routeMap[tabId]) {
        onNavigate(routeMap[tabId]);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Data states
  const [metrics, setMetrics] = useState(null);
  const [branchStats, setBranchStats] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);

  // Sub-tab data
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [delayedDeliveries, setDelayedDeliveries] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [agentsList, setAgentsList] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);

  // Modals
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isRecordPurchaseOpen, setIsRecordPurchaseOpen] = useState(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [warningModalTarget, setWarningModalTarget] = useState(null);
  const [warningReason, setWarningReason] = useState('');
  const [reassignModalTarget, setReassignModalTarget] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  // Form state: Add Product (Image-free)
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    description: '',
    categoryId: 1,
    price: '',
    stockQuantity: 20,
    reorderLevel: 5,
    branchIds: [1, 2, 3]
  });

  // Form state: Add Delivery Agent
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    password: '',
    branchId: 1,
    phone: '',
    vehicleNumber: ''
  });

  // Form state: Add Admin User
  const [adminForm, setAdminForm] = useState({
    name: '',
    email: '',
    password: ''
  });

  // Form state: Purchase Restocking
  const [purchaseForm, setPurchaseForm] = useState({
    supplierId: 1,
    invoiceNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    productId: 1,
    quantity: 25,
    costPrice: 50.00,
    notes: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsRes, prodsRes, catsRes, suppRes, ordersRes, delayedRes, usersRes, logsRes, agentsRes] = await Promise.all([
        api.admin.getMetrics(),
        api.products.getAll({ includeInactive: true }),
        api.products.getCategories(),
        api.admin.getSuppliers(),
        api.orders.getAll({ limit: 50 }),
        api.admin.getDelayedDeliveries(),
        api.admin.getUsers(),
        api.admin.getStockTransactions({ limit: 40 }),
        api.admin.getAgents()
      ]);

      if (metricsRes.success) {
        setMetrics(metricsRes.metrics);
        setBranchStats(metricsRes.branchStats || []);
        setBestSellers(metricsRes.bestSellers || []);
        setLowStockItems(metricsRes.lowStockItems || []);
      }
      if (prodsRes.success) setProducts(prodsRes.products || []);
      if (catsRes.success) setCategories(catsRes.categories || []);
      if (suppRes.success) setSuppliers(suppRes.suppliers || []);
      if (ordersRes.success) setOrders(ordersRes.orders || []);
      if (delayedRes.success) setDelayedDeliveries(delayedRes.orders || []);
      if (usersRes.success) setUsersList(usersRes.users || []);
      if (logsRes.success) setAuditLogs(logsRes.transactions || []);
      if (agentsRes.success) setAgentsList(agentsRes.agents || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Add Product
  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await api.admin.createProduct(newProduct);
      if (res.success) {
        showToast('Product created successfully and catalog updated.', 'success');
        setIsAddProductOpen(false);
        setNewProduct({
          name: '',
          sku: '',
          description: '',
          categoryId: 1,
          price: '',
          stockQuantity: 20,
          reorderLevel: 5,
          branchIds: [1, 2, 3]
        });
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to create product.', 'error');
    }
  };

  // Handle Create Delivery Agent
  const handleCreateAgent = async (e) => {
    e.preventDefault();
    try {
      const res = await api.admin.createAgent(agentForm);
      if (res.success) {
        showToast(res.message || 'Delivery Agent provisioned successfully.', 'success');
        setIsAddAgentOpen(false);
        setAgentForm({
          name: '',
          email: '',
          password: '',
          branchId: 1,
          phone: '',
          vehicleNumber: ''
        });
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to provision delivery agent.', 'error');
    }
  };

  // Handle Toggle Delivery Agent Status
  const handleToggleAgentStatus = async (agentId) => {
    try {
      const res = await api.admin.toggleAgentStatus(agentId);
      if (res.success) {
        showToast(res.message || 'Agent status updated.', 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to toggle agent status.', 'error');
    }
  };

  // Handle Create Admin User
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.admin.createAdmin(adminForm);
      if (res.success) {
        showToast(res.message || 'Administrator account provisioned successfully.', 'success');
        setIsAddAdminOpen(false);
        setAdminForm({ name: '', email: '', password: '' });
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to create administrator.', 'error');
    }
  };

  // Handle Toggle Product Status
  const handleToggleProduct = async (productId) => {
    try {
      const res = await api.admin.toggleProductStatus(productId);
      if (res.success) {
        showToast(res.message, 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Record Purchase
  const handleRecordPurchase = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        supplierId: purchaseForm.supplierId,
        invoiceNumber: purchaseForm.invoiceNumber,
        purchaseDate: purchaseForm.purchaseDate,
        notes: purchaseForm.notes,
        items: [{
          productId: purchaseForm.productId,
          quantity: purchaseForm.quantity,
          costPrice: purchaseForm.costPrice
        }]
      };

      const res = await api.admin.recordPurchase(payload);
      if (res.success) {
        showToast(res.message, 'success');
        setIsRecordPurchaseOpen(false);
        loadData();
      }
    } catch (err) {
      showToast(err.message || 'Failed to record purchase.', 'error');
    }
  };

  // Handle Issue Warning
  const handleIssueWarning = async (e) => {
    e.preventDefault();
    if (!warningReason.trim()) return;

    try {
      const res = await api.admin.issueWarning({
        agentId: warningModalTarget.agent_id,
        orderId: warningModalTarget.order_id,
        deliveryId: warningModalTarget.delivery_id,
        reason: warningReason.trim()
      });
      if (res.success) {
        showToast(res.message, 'success');
        setWarningModalTarget(null);
        setWarningReason('');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Reassign Order
  const handleReassignOrder = async (e) => {
    e.preventDefault();
    if (!selectedAgentId) return;

    try {
      const res = await api.admin.reassignOrder(reassignModalTarget.order_id, selectedAgentId);
      if (res.success) {
        showToast(res.message, 'success');
        setReassignModalTarget(null);
        setSelectedAgentId('');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Handle Verify User
  const handleVerifyUser = async (userId) => {
    try {
      const res = await api.admin.verifyUser(userId);
      if (res.success) {
        showToast('User verified and approved.', 'success');
        loadData();
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const deliveryAgents = usersList.filter(u => u.role === 'DELIVERY_AGENT' && u.is_active);

  const COLORS = ['#2563eb', '#9333ea', '#0d9488'];

  // Admin section navigation definition
  const navTabs = [
    { id: 'overview', label: 'Executive Hub', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'products', label: 'Inventory', icon: <Package className="w-4 h-4" />, badge: products.length },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      badge: orders.length,
      badgeColor: orders.filter(o => ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.order_status)).length > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
    },
    {
      id: 'sla',
      label: 'SLA & Warnings',
      icon: <ShieldAlert className="w-4 h-4" />,
      badge: delayedDeliveries.length,
      badgeColor: delayedDeliveries.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
    },
    { id: 'agents', label: 'Delivery Agents', icon: <Truck className="w-4 h-4" />, badge: agentsList.length },
    { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, badge: usersList.length },
    { id: 'audit', label: 'Stock Audit Log', icon: <History className="w-4 h-4" />, badge: auditLogs.length }
  ];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-400/30">
            <ClipboardList className="w-3.5 h-3.5" />
            <span>Store Administrator Central</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black mt-1">
            Executive Command & Inventory Manager
          </h1>
          <p className="text-xs text-slate-300">
            University stationery operations, branch isolation rules, stock auditing, and agent SLA compliance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadData}
            title="Refresh All Dashboard Data"
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sky-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsRecordPurchaseOpen(true)}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Restock Supplier Batch</span>
          </button>
          <button
            onClick={() => setIsAddProductOpen(true)}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-navy-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stationery Item</span>
          </button>
          <button
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="lg:hidden px-3.5 py-2 rounded-xl bg-slate-800 text-sky-300 text-xs font-bold flex items-center gap-1.5 border border-slate-700 shadow-sm"
          >
            {isMobileNavOpen ? <X className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-sky-400" />}
            <span>Sections</span>
          </button>
        </div>
      </div>

      {/* Main Layout Container: Sidebar + Content */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* RESPONSIVE ADMIN SIDEBAR */}
        <aside className="w-full lg:w-64 flex-shrink-0">
          
          {/* Mobile Collapsible Navigation Drawer */}
          <div className="lg:hidden w-full mb-4">
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active:</span>
                <span className="text-xs font-black text-navy-950 px-2.5 py-0.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900">
                  {navTabs.find(t => t.id === activeTab)?.label}
                </span>
              </div>
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
              >
                {isMobileNavOpen ? <X className="w-3.5 h-3.5 text-rose-600" /> : <Menu className="w-3.5 h-3.5 text-navy-900" />}
                <span>{isMobileNavOpen ? 'Hide Menu' : 'Switch View'}</span>
              </button>
            </div>

            {isMobileNavOpen && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-1.5 mt-2 animate-in fade-in slide-in-from-top-2">
                {navTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      activeTab === tab.id
                        ? 'bg-navy-950 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={activeTab === tab.id ? 'text-sky-400' : 'text-slate-500'}>
                        {tab.icon}
                      </span>
                      <span>{tab.label}</span>
                    </div>
                    {tab.badge !== undefined && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : tab.badgeColor || 'bg-slate-100 text-slate-700'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Sticky Sidebar */}
          <div className="hidden lg:block sticky top-20 bg-white rounded-2xl border border-slate-200 shadow-sm p-3.5 space-y-4">
            <div className="px-2 pt-1 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Admin Control</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Live"></span>
            </div>

            <nav className="space-y-1">
              {navTabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-navy-950 text-white shadow-md shadow-navy-950/20 translate-x-1'
                      : 'text-slate-600 hover:text-navy-950 hover:bg-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={activeTab === tab.id ? 'text-sky-400' : 'text-slate-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : tab.badgeColor || 'bg-slate-100 text-slate-700'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>

            {/* SLA Status Widget in Sidebar */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Delivery SLA Policy</span>
                <span className="font-bold text-navy-900">30 Mins</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 font-medium">
                <span>Branch Isolation</span>
                <span className="font-bold text-emerald-600">Enforced</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span>Campus Store Engine</span>
                <span className="font-semibold text-slate-600">v1.2 Active</span>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT VIEWPORT */}
        <div className="flex-1 min-w-0 w-full space-y-6">

          {/* TAB 1: EXECUTIVE HUB (KPIs, OPERATIONAL OVERVIEW & RECHARTS) */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* REQUIREMENT 3: FIVE KPI SUMMARY CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3.5">
                
                {/* 1. Total Products */}
                <div 
                  onClick={() => handleTabChange('products')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Products</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Package className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-navy-950">
                      {metrics?.totalProducts ?? products.filter(p => p.is_active).length}
                    </div>
                    <p className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                      <span>Active in catalogue</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {categories.length} academic categories
                  </div>
                </div>

                {/* 2. Total Stock Units */}
                <div 
                  onClick={() => handleTabChange('products')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-cyan-400 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Total Stock Units</span>
                    <div className="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-navy-950">
                      {metrics?.totalStockUnits ?? products.reduce((acc, p) => acc + (p.stock_quantity || 0), 0)}
                    </div>
                    <p className="text-[11px] text-cyan-700 font-semibold flex items-center gap-1 mt-0.5">
                      <span>Units across warehouse</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Campus-wide inventory
                  </div>
                </div>

                {/* 3. Pending Orders */}
                <div 
                  onClick={() => handleTabChange('orders')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-amber-400 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Pending Orders</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-amber-600">
                      {metrics?.pendingOrders ?? orders.filter(o => ['PENDING', 'ACCEPTED', 'OUT_FOR_DELIVERY'].includes(o.order_status)).length}
                    </div>
                    <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 mt-0.5">
                      <span>In fulfillment queue</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {metrics?.ordersToday || 0} orders placed today
                  </div>
                </div>

                {/* 4. Low-Stock Items */}
                <div 
                  onClick={() => handleTabChange('products')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-rose-400 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Low-Stock Items</span>
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-rose-600">
                      {metrics?.lowStockCount ?? lowStockItems.length}
                    </div>
                    <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1 mt-0.5">
                      <span>At/below reorder mark</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    {metrics?.outOfStockCount || 0} completely out of stock
                  </div>
                </div>

                {/* 5. Active Delivery Agents */}
                <div 
                  onClick={() => handleTabChange('agents')}
                  className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md hover:border-emerald-400 transition-all cursor-pointer group space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">Active Delivery Agents</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-emerald-700">
                      {metrics?.activeDeliveryAgents ?? agentsList.filter(a => a.is_active).length}
                    </div>
                    <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                      <span>On-duty branch dispatchers</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">
                    Assigned across 05, 66 & 67
                  </div>
                </div>
              </div>

              {/* REQUIREMENT 4: LIVE OPERATIONAL OVERVIEW (4-CARD GRID) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Low-Stock Attention with Branch Badges */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-navy-950">Low-Stock Attention</h3>
                        <p className="text-[11px] text-slate-400">Inventory items nearing exhaustion</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('products')}
                      className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors"
                    >
                      <span>View Inventory</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {lowStockItems.length === 0 ? (
                    <div className="py-8 text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">All inventory levels are healthy</p>
                      <p className="text-[11px] text-slate-400">No stationery items are currently below reorder thresholds.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 text-xs">
                      {lowStockItems.map(p => (
                        <div key={p.product_id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 truncate">{p.name}</div>
                            <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                              <span className="font-mono text-slate-400">{p.sku}</span>
                              <span>•</span>
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-semibold text-[10px]">
                                {p.branch_codes ? `Branch: ${p.branch_codes}` : (p.category_name || 'All Branches')}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400 text-[10px]">Reorder: {p.reorder_level}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-rose-100 text-rose-700">
                              {p.stock_quantity} left
                            </span>
                            <button
                              onClick={() => {
                                setPurchaseForm(prev => ({ ...prev, productId: p.product_id }));
                                setIsRecordPurchaseOpen(true);
                              }}
                              className="px-2 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 font-bold text-[11px] border border-sky-200 transition-colors"
                            >
                              Restock
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Recent Stock Transactions (Stock Audit Feed) */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                        <History className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-navy-950">Recent Stock Transactions</h3>
                        <p className="text-[11px] text-slate-400">Live inventory audit log entries</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('audit')}
                      className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors"
                    >
                      <span>Full Audit Log</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No stock audit transactions recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 text-xs">
                      {auditLogs.slice(0, 6).map(log => (
                        <div key={log.transaction_id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase ${
                                log.transaction_type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-800' :
                                log.transaction_type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                                log.transaction_type === 'CANCELLATION_RESTOCK' ? 'bg-purple-100 text-purple-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.transaction_type}
                              </span>
                              <span className="font-bold text-slate-900 truncate">{log.product_name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {log.actor_name ? `${log.actor_name} • ` : ''}
                              {log.notes || `${log.previous_stock} → ${log.new_stock} units`}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <span className={`font-black text-xs ${
                              log.quantity_change > 0 ? 'text-emerald-600' : 'text-slate-700'
                            }`}>
                              {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                            </span>
                            <div className="text-[10px] text-slate-400">
                              {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Recent & Pending Campus Orders */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-navy-950">Recent & Pending Orders</h3>
                        <p className="text-[11px] text-slate-400">Fulfillment queue across academic branches</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('orders')}
                      className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors"
                    >
                      <span>View All Orders</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No campus orders recorded yet.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 text-xs">
                      {orders.slice(0, 6).map(o => (
                        <div key={o.order_id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-navy-950">{o.order_number}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {o.branch_code}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                              {o.student_name} • {o.delivery_location || 'Campus Desk'}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 space-y-0.5">
                            <div className="font-black text-navy-950">₹{parseFloat(o.total_amount).toFixed(2)}</div>
                            <span className={`inline-block px-2 py-0.2 rounded-full text-[10px] font-bold ${
                              o.order_status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                              o.order_status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                              o.order_status === 'OUT_FOR_DELIVERY' ? 'bg-sky-100 text-sky-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {o.order_status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Delivery SLA Audits & Issues */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                        <ShieldAlert className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-navy-950">Delivery SLA Audits</h3>
                        <p className="text-[11px] text-slate-400">30-min threshold monitoring & compliance</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTabChange('sla')}
                      className="text-xs font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 transition-colors"
                    >
                      <span>SLA Console</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {delayedDeliveries.length === 0 ? (
                    <div className="py-8 text-center space-y-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto font-bold text-sm">
                        ✓
                      </div>
                      <p className="text-xs font-bold text-slate-800">100% SLA Compliance</p>
                      <p className="text-[11px] text-slate-400">
                        Average delivery duration: <span className="font-bold text-sky-700">{metrics?.avgDeliveryMinutes || 0} mins</span>. No active delivery delays.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 text-xs">
                      {delayedDeliveries.slice(0, 5).map(d => (
                        <div key={d.delivery_id} className="py-2.5 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-navy-950">{d.order_number}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                +{Math.max(0, (d.delivery_duration_minutes || 0) - 30)}m delay
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Agent: <span className="font-semibold text-slate-700">{d.agent_name || 'Unassigned'}</span> ({d.branch_code})
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-black text-rose-600">{d.delivery_duration_minutes} mins</div>
                            {d.agent_id && (
                              <button
                                onClick={() => {
                                  setWarningModalTarget(d);
                                  setWarningReason(`Delivery for Order #${d.order_number} took ${d.delivery_duration_minutes} mins, exceeding the 30-minute campus delivery threshold.`);
                                }}
                                className="text-[10px] text-amber-700 hover:text-amber-900 font-bold underline"
                              >
                                Issue Warning
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* Financial Revenue & Delivery Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Completed Revenue</span>
                  <div className="text-2xl font-black text-navy-950">₹{metrics?.totalRevenue?.toFixed(2) || '0.00'}</div>
                  <p className="text-[11px] text-emerald-600 font-semibold">{metrics?.completedOrders || 0} completed orders</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Pending</span>
                  <div className="text-2xl font-black text-amber-600">{metrics?.pendingOrders || 0}</div>
                  <p className="text-[11px] text-slate-500">In fulfillment / dispatch</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Inventory Health</span>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-rose-600">{metrics?.outOfStockCount || 0}</span>
                    <span className="text-xs text-slate-400">out of stock</span>
                  </div>
                  <p className="text-[11px] text-amber-600 font-bold">{metrics?.lowStockCount || 0} low-stock alerts</p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avg Delivery Time</span>
                  <div className="text-2xl font-black text-sky-700">{metrics?.avgDeliveryMinutes || 0} mins</div>
                  <p className="text-[11px] text-slate-500">{metrics?.delayedOrdersCount || 0} delayed past 30m SLA</p>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Branch-wise Orders & Sales Distribution (BarChart) */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-sm text-navy-950">Branch-wise Sales (₹)</h3>
                    <span className="text-[11px] text-slate-400">CSE (05), CSM (66), CSD (67)</span>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={branchStats}>
                        <XAxis dataKey="branch_code" stroke="#64748b" fontSize={12} tickLine={false} />
                        <YAxis stroke="#64748b" fontSize={12} tickLine={false} />
                        <Tooltip
                          formatter={(val) => [`₹${parseFloat(val).toFixed(2)}`, 'Revenue']}
                          labelFormatter={(code) => `Branch ${code}`}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                        />
                        <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                          {branchStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Top 5 Best Selling Stationery Table */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-sm text-navy-950">Best-Selling Academic Stationery</h3>
                  <div className="divide-y divide-slate-100 overflow-y-auto max-h-60 text-xs">
                    {bestSellers.map((item, idx) => (
                      <div key={item.product_id} className="py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="font-bold text-slate-900 truncate max-w-xs">{item.name}</div>
                            <div className="text-[10px] text-slate-400">{item.category_name} • SKU: {item.sku}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-navy-950">₹{parseFloat(item.total_sales).toFixed(2)}</span>
                          <div className="text-[10px] text-emerald-600 font-semibold">{item.units_sold} units sold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}

      {/* TAB 2: INVENTORY & PRODUCTS CRUD */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-navy-950">Stationery Catalogue Management</h3>
            <button
              onClick={() => setIsAddProductOpen(true)}
              className="px-3.5 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Product</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Product</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">Branch Links</th>
                  <th className="py-3 px-3">Price</th>
                  <th className="py-3 px-3">Stock Level</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map(p => (
                  <tr key={p.product_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{p.name}</td>
                    <td className="py-3 px-3">{p.category_name}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{p.sku}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {p.available_branches || 'All'}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-navy-950">₹{p.price.toFixed(2)}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                        p.stock_quantity === 0
                          ? 'bg-rose-100 text-rose-700'
                          : p.stock_quantity <= p.reorder_level
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stock_quantity} units
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${p.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {p.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleToggleProduct(p.product_id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                          p.is_active
                            ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                            : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                        }`}
                      >
                        {p.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS & REASSIGNMENTS */}
      {activeTab === 'orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-navy-950">All Campus Orders</h3>
            <span className="text-xs text-slate-400">Total: {orders.length} orders</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Order Number</th>
                  <th className="py-3 px-3">Student</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3">Delivery Destination</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Total</th>
                  <th className="py-3 px-3">Assigned Agent</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map(o => (
                  <tr key={o.order_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-navy-950">{o.order_number}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{o.student_name}</div>
                      <div className="text-[10px] text-slate-400">{o.student_email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800">
                        {o.branch_code}
                      </span>
                    </td>
                    <td className="py-3 px-3 max-w-[150px] truncate">{o.delivery_location}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        o.order_status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
                        o.order_status === 'CANCELLED' ? 'bg-slate-100 text-slate-600' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {o.order_status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-extrabold text-navy-950">₹{parseFloat(o.total_amount).toFixed(2)}</td>
                    <td className="py-3 px-3">
                      {o.agent_name ? (
                        <div className="font-medium text-slate-800">{o.agent_name}</div>
                      ) : (
                        <span className="text-rose-600 font-bold text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {o.order_status !== 'DELIVERED' && o.order_status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setReassignModalTarget(o);
                            setSelectedAgentId('');
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                        >
                          Reassign
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: SLA & AGENT WARNINGS REVIEW */}
      {activeTab === 'sla' && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 leading-relaxed">
            <span className="font-bold">Institutional Policy: </span>
            Standard delivery threshold is configured at <span className="font-bold">30 minutes</span>. If an order acceptance-to-delivery duration exceeds this limit, it is automatically flagged below for administrative review before any disciplinary warning is issued.
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
            <h3 className="font-extrabold text-base text-navy-950">Delayed Deliveries & SLA Audits</h3>

            {delayedDeliveries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No deliveries currently exceed the SLA threshold. Excellent performance!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">Order</th>
                      <th className="py-3 px-3">Branch</th>
                      <th className="py-3 px-3">Responsible Agent</th>
                      <th className="py-3 px-3">Delivery Duration</th>
                      <th className="py-3 px-3">SLA Variance</th>
                      <th className="py-3 px-3">Existing Warnings</th>
                      <th className="py-3 px-3 text-right">Administrative Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {delayedDeliveries.map(d => (
                      <tr key={d.delivery_id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-navy-950">{d.order_number}</td>
                        <td className="py-3 px-3">{d.branch_code}</td>
                        <td className="py-3 px-3 font-semibold text-slate-900">{d.agent_name || 'Unassigned'}</td>
                        <td className="py-3 px-3 font-bold text-rose-600">{d.delivery_duration_minutes || '—'} mins</td>
                        <td className="py-3 px-3 text-slate-500">+{Math.max(0, (d.delivery_duration_minutes || 0) - 30)} mins over threshold</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100">
                            {d.warnings_issued} recorded
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {d.agent_id && (
                            <button
                              onClick={() => {
                                setWarningModalTarget(d);
                                setWarningReason(`Delivery for Order #${d.order_number} took ${d.delivery_duration_minutes} minutes, exceeding the 30-minute campus delivery threshold.`);
                              }}
                              className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm"
                            >
                              Issue Warning
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: DELIVERY AGENT MANAGEMENT */}
      {activeTab === 'agents' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-navy-950">Delivery Agent Management</h3>
              <p className="text-xs text-slate-500">
                Designated delivery personnel assigned per academic branch (CSE 05, CSM 66, CSD 67). Enforces one active agent per branch policy.
              </p>
            </div>
            <button
              onClick={() => setIsAddAgentOpen(true)}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Delivery Agent</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Agent Name</th>
                  <th className="py-3 px-3">Institutional Email</th>
                  <th className="py-3 px-3">Assigned Branch</th>
                  <th className="py-3 px-3">Contact Phone</th>
                  <th className="py-3 px-3">Vehicle No.</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {agentsList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      No delivery agents provisioned yet.
                    </td>
                  </tr>
                ) : (
                  agentsList.map(agent => (
                    <tr key={agent.user_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{agent.name}</td>
                      <td className="py-3 px-3 font-mono text-[11px] text-slate-500">{agent.email}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          agent.branch_code === '05' ? 'bg-blue-50 text-blue-800 border-blue-200' :
                          agent.branch_code === '66' ? 'bg-purple-50 text-purple-800 border-purple-200' :
                          'bg-teal-50 text-teal-800 border-teal-200'
                        }`}>
                          {agent.branch_name} ({agent.branch_code})
                        </span>
                      </td>
                      <td className="py-3 px-3">{agent.phone || '—'}</td>
                      <td className="py-3 px-3 font-mono text-[11px]">{agent.vehicle_number || '—'}</td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          agent.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-emerald-600' : 'bg-slate-400'}`}></span>
                          {agent.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleToggleAgentStatus(agent.user_id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            agent.is_active
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {agent.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: USERS & VERIFICATIONS */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-navy-950">University Users & Role Authorizations</h3>
              <p className="text-xs text-slate-500">
                Manage registered students, delivery personnel, and administrative accounts.
              </p>
            </div>
            <button
              onClick={() => setIsAddAdminOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Provision Administrator</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Name</th>
                  <th className="py-3 px-3">Institutional Email</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Branch</th>
                  <th className="py-3 px-3">Contact</th>
                  <th className="py-3 px-3">Verification</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map(u => (
                  <tr key={u.user_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                        u.role === 'DELIVERY_AGENT' ? 'bg-sky-100 text-sky-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">{u.branch_code || 'All Branches'}</td>
                    <td className="py-3 px-3">{u.phone || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${u.is_verified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>
                        {u.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {!u.is_verified && (
                        <button
                          onClick={() => handleVerifyUser(u.user_id)}
                          className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold"
                        >
                          Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: AUDIT LOG (Stock_Transactions) */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-navy-950">Stock Transactions Audit Log</h3>
            <span className="text-xs text-slate-400">Complete inventory traceability</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Stationery Item</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-3">Change</th>
                  <th className="py-3 px-3">Stock Progression</th>
                  <th className="py-3 px-3">Actor / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.transaction_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-slate-400">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-900">{log.product_name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        log.transaction_type === 'PURCHASE' ? 'bg-emerald-100 text-emerald-800' :
                        log.transaction_type === 'SALE' ? 'bg-blue-100 text-blue-800' :
                        log.transaction_type === 'CANCELLATION_RESTOCK' ? 'bg-purple-100 text-purple-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {log.transaction_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-black">
                      <span className={log.quantity_change > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        {log.quantity_change > 0 ? `+${log.quantity_change}` : log.quantity_change}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {log.previous_stock} → {log.new_stock}
                    </td>
                    <td className="py-3 px-3 max-w-xs truncate">
                      <span className="font-semibold text-slate-800">{log.actor_name || 'System'}: </span>
                      <span>{log.notes}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

        </div>
      </div>

      {/* MODAL: ADD PRODUCT */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-navy-950">Add Stationery Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Product Name</label>
                <input
                  type="text"
                  required
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g. CSE Discrete Math Observation Record"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">SKU Code</label>
                  <input
                    type="text"
                    required
                    value={newProduct.sku}
                    onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })}
                    placeholder="CSE-DIS-01"
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={newProduct.categoryId}
                    onChange={(e) => setNewProduct({ ...newProduct, categoryId: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.category_id} value={c.category_id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Price (₹)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    placeholder="120.00"
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Stock Qty</label>
                  <input
                    type="number"
                    required
                    value={newProduct.stockQuantity}
                    onChange={(e) => setNewProduct({ ...newProduct, stockQuantity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Reorder Threshold</label>
                  <input
                    type="number"
                    required
                    value={newProduct.reorderLevel}
                    onChange={(e) => setNewProduct({ ...newProduct, reorderLevel: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Branch Visibility Checkboxes</label>
                <div className="flex gap-4 mt-1.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                  {[
                    { id: 1, code: 'CSE (05)' },
                    { id: 2, code: 'CSM (66)' },
                    { id: 3, code: 'CSD (67)' }
                  ].map(b => (
                    <label key={b.id} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProduct.branchIds.includes(b.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewProduct({ ...newProduct, branchIds: [...newProduct.branchIds, b.id] });
                          } else {
                            setNewProduct({ ...newProduct, branchIds: newProduct.branchIds.filter(id => id !== b.id) });
                          }
                        }}
                        className="rounded text-navy-800"
                      />
                      <span>{b.code}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddProductOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-navy-900 text-white font-bold"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESTOCK SUPPLIER BATCH */}
      {isRecordPurchaseOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-navy-950">Record Supplier Stock Procurement</h3>
            <p className="text-xs text-slate-500">
              Procuring stock transactionally updates the product inventory and creates an entry in the Stock_Transactions audit log.
            </p>

            <form onSubmit={handleRecordPurchase} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Supplier</label>
                <select
                  value={purchaseForm.supplierId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                >
                  {suppliers.map(s => (
                    <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Invoice Number</label>
                  <input
                    type="text"
                    value={purchaseForm.invoiceNumber}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                    placeholder="INV-2026-OCT-88"
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Select Item to Restock</label>
                <select
                  value={purchaseForm.productId}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, productId: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                >
                  {products.map(p => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.name} (Current Stock: {p.stock_quantity})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Inflow Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={purchaseForm.quantity}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Unit Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.50"
                    required
                    value={purchaseForm.costPrice}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, costPrice: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700">Notes</label>
                <input
                  type="text"
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  placeholder="Semester start bulk order..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsRecordPurchaseOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-700 text-white font-bold"
                >
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ISSUE WARNING */}
      {warningModalTarget && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-navy-950">Issue Formal Disciplinary Warning</h3>
            <p className="text-xs text-slate-500">
              Responsible Agent: <span className="font-bold text-slate-800">{warningModalTarget.agent_name}</span> • Order #{warningModalTarget.order_number}
            </p>

            <form onSubmit={handleIssueWarning} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Warning Reason & Justification</label>
                <textarea
                  rows={3}
                  required
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setWarningModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
                >
                  Issue Notice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REASSIGN ORDER */}
      {reassignModalTarget && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-extrabold text-base text-navy-950">Reassign Delivery Agent</h3>
            <p className="text-xs text-slate-500">
              Reassign Order #{reassignModalTarget.order_number} for Branch {reassignModalTarget.branch_code}.
            </p>

            <form onSubmit={handleReassignOrder} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700">Choose Active Delivery Agent</label>
                <select
                  required
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                >
                  <option value="">-- Select Agent --</option>
                  {deliveryAgents.map(ag => (
                    <option key={ag.user_id} value={ag.user_id}>
                      {ag.name} ({ag.branch_code || 'Branch Agent'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setReassignModalTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!selectedAgentId}
                  className="px-4 py-2 rounded-xl bg-navy-900 text-white font-bold disabled:opacity-50"
                >
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION DELIVERY AGENT */}
      {isAddAgentOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="font-extrabold text-base text-navy-950">Provision Delivery Agent Account</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Onboard designated campus delivery personnel. System strictly enforces 1 active agent per academic branch.
              </p>
            </div>

            <form onSubmit={handleCreateAgent} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Agent Full Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={agentForm.name}
                  onChange={(e) => setAgentForm({ ...agentForm, name: e.target.value })}
                  placeholder="e.g. Demo Delivery Agent"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Institutional Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={agentForm.email}
                  onChange={(e) => setAgentForm({ ...agentForm, email: e.target.value })}
                  placeholder="e.g. demo.agent05@example.test"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none font-mono focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
                <p className="text-[10px] text-slate-400 mt-1">Must be an institutional email ending with branch code (e.g. demo.agent05@example.test).</p>
              </div>

              <div>
                <label className="font-bold text-slate-700">Assigned Academic Branch <span className="text-rose-500">*</span></label>
                <select
                  required
                  value={agentForm.branchId}
                  onChange={(e) => setAgentForm({ ...agentForm, branchId: parseInt(e.target.value, 10) })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600"
                >
                  <option value={1}>Computer Science & Engineering (05)</option>
                  <option value={2}>AI & Machine Learning (66)</option>
                  <option value={3}>Data Science (67)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700">Temporary Setup Password <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={agentForm.password}
                  onChange={(e) => setAgentForm({ ...agentForm, password: e.target.value })}
                  placeholder="Min. 8 chars with upper, lower, digit & special"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700">Contact Phone</label>
                  <input
                    type="tel"
                    value={agentForm.phone}
                    onChange={(e) => setAgentForm({ ...agentForm, phone: e.target.value })}
                    placeholder="Optional contact phone"
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700">Vehicle / Cycle No.</label>
                  <input
                    type="text"
                    value={agentForm.vehicleNumber}
                    onChange={(e) => setAgentForm({ ...agentForm, vehicleNumber: e.target.value })}
                    placeholder="TS 08 AB 1234"
                    className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAgentOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold"
                >
                  Provision Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION ADMINISTRATOR */}
      {isAddAdminOpen && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div>
              <h3 className="font-extrabold text-base text-navy-950">Provision Store Administrator</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Create an additional administrative user with access to store catalog, order management, agent warnings, and analytics.
              </p>
            </div>

            <form onSubmit={handleCreateAdmin} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700">Administrator Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  required
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  placeholder="Demo Administrator"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Institutional Email <span className="text-rose-500">*</span></label>
                <input
                  type="email"
                  required
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="admin.secondary@example.test"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none font-mono focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700">Password <span className="text-rose-500">*</span></label>
                <input
                  type="password"
                  required
                  value={adminForm.password}
                  onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                  placeholder="Min. 8 chars with upper, lower, digit & special"
                  className="w-full p-2.5 rounded-xl border border-slate-300 mt-1 outline-none focus:border-navy-600 focus:ring-1 focus:ring-navy-600"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAdminOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white font-bold"
                >
                  Provision Administrator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
