/**
 * Centralized API service for StockSense AI
 */

const BASE_URL = '/api';

/**
 * Fetch wrapper that automatically injects JWT token
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('stocksense_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({
    success: false,
    message: 'Invalid response from server.'
  }));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Authentication
  auth: {
    register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
    login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
    agentLogin: (payload) => request('/auth/agent/login', { method: 'POST', body: JSON.stringify(payload) }),
    getProfile: () => request('/auth/profile'),
    updateProfile: (payload) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(payload) }),
    changePassword: (payload) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Products & Branches
  products: {
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.categoryId) searchParams.set('categoryId', params.categoryId);
      if (params.search) searchParams.set('search', params.search);
      if (params.branchId) searchParams.set('branchId', params.branchId);
      if (params.includeInactive) searchParams.set('includeInactive', params.includeInactive);
      const query = searchParams.toString();
      return request(`/products${query ? `?${query}` : ''}`);
    },
    getById: (id) => request(`/products/${id}`),
    getCategories: () => request('/products/categories'),
    getBranches: () => request('/products/branches')
  },

  // Cart (Database-backed per-student isolation)
  cart: {
    get: () => request('/cart'),
    addItem: ({ productId, quantity = 1 } = {}) => request('/cart/items', { method: 'POST', body: JSON.stringify({ productId, quantity }) }),
    updateQuantity: (productId, quantity) => request(`/cart/items/${productId}`, { method: 'PUT', body: JSON.stringify({ quantity }) }),
    removeItem: (productId) => request(`/cart/items/${productId}`, { method: 'DELETE' }),
    clear: () => request('/cart', { method: 'DELETE' })
  },

  // Orders
  orders: {
    checkout: (payload) => request('/orders/checkout', { method: 'POST', body: JSON.stringify(payload) }),
    getMyOrders: () => request('/orders/my-orders'),
    getById: (id) => request(`/orders/${id}`),
    cancel: (id, reason) => request(`/orders/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    getAll: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.branchId) searchParams.set('branchId', params.branchId);
      if (params.status) searchParams.set('status', params.status);
      if (params.search) searchParams.set('search', params.search);
      const query = searchParams.toString();
      return request(`/orders${query ? `?${query}` : ''}`);
    }
  },

  // Delivery Agent
  delivery: {
    getOrders: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.status) searchParams.set('status', params.status);
      const query = searchParams.toString();
      return request(`/delivery/orders${query ? `?${query}` : ''}`);
    },
    accept: (id) => request(`/delivery/orders/${id}/accept`, { method: 'POST' }),
    decline: (id, reason) => request(`/delivery/orders/${id}/decline`, { method: 'POST', body: JSON.stringify({ reason }) }),
    dispatch: (id) => request(`/delivery/orders/${id}/dispatch`, { method: 'POST' }),
    verifyOtp: (id, otp) => request(`/delivery/orders/${id}/verify-otp`, { method: 'POST', body: JSON.stringify({ otp }) }),
    getWarnings: () => request('/delivery/warnings')
  },

  // Admin Management
  admin: {
    getMetrics: () => request('/admin/metrics'),
    createProduct: (payload) => request('/admin/products', { method: 'POST', body: JSON.stringify(payload) }),
    updateProduct: (id, payload) => request(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
    toggleProductStatus: (id) => request(`/admin/products/${id}/toggle-status`, { method: 'PUT' }),
    recordPurchase: (payload) => request('/admin/purchases', { method: 'POST', body: JSON.stringify(payload) }),
    getSuppliers: () => request('/admin/suppliers'),
    createSupplier: (payload) => request('/admin/suppliers', { method: 'POST', body: JSON.stringify(payload) }),
    getDelayedDeliveries: () => request('/admin/delayed-deliveries'),
    issueWarning: (payload) => request('/admin/warnings', { method: 'POST', body: JSON.stringify(payload) }),
    resolveWarning: (id, payload) => request(`/admin/warnings/${id}/resolve`, { method: 'PUT', body: JSON.stringify(payload) }),
    reassignOrder: (orderId, agentId) => request(`/admin/orders/${orderId}/reassign`, { method: 'POST', body: JSON.stringify({ agentId }) }),
    getUsers: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.role) searchParams.set('role', params.role);
      if (params.branchId) searchParams.set('branchId', params.branchId);
      if (params.search) searchParams.set('search', params.search);
      const query = searchParams.toString();
      return request(`/admin/users${query ? `?${query}` : ''}`);
    },
    verifyUser: (id) => request(`/admin/users/${id}/verify`, { method: 'PUT' }),
    getStockTransactions: (params = {}) => {
      const searchParams = new URLSearchParams();
      if (params.productId) searchParams.set('productId', params.productId);
      if (params.limit) searchParams.set('limit', params.limit);
      const query = searchParams.toString();
      return request(`/admin/stock-transactions${query ? `?${query}` : ''}`);
    },
    // Delivery Agent Management
    getAgents: () => request('/admin/agents'),
    createAgent: (payload) => request('/admin/agents', { method: 'POST', body: JSON.stringify(payload) }),
    toggleAgentStatus: (id) => request(`/admin/agents/${id}/toggle-status`, { method: 'PUT' }),
    createAdmin: (payload) => request('/admin/create-admin', { method: 'POST', body: JSON.stringify(payload) })
  },

  // Notifications
  notifications: {
    getAll: () => request('/notifications'),
    markAsRead: (id) => request(`/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () => request('/notifications/read-all', { method: 'PUT' })
  }
};
