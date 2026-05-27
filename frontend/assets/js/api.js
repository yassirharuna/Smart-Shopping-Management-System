/*
  SMART SHOP MANAGEMENT SYSTEM
  Frontend API Client (fetch wrapper)

  - Uses JWT stored in localStorage (NO COOKIES)
  - Adds Authorization header to all protected requests
  - Centralized error handling
*/

(function () {
  const API_BASE = (window.location.origin.includes('localhost')
    ? window.location.origin
    : window.location.origin) + '/api';

  function getToken() {
    return localStorage.getItem('token');
  }

  function authHeaders() {
    const token = getToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }

  async function request(path, { method = 'GET', body = null, headers = {}, auth = true, signal } = {}) {
    const url = API_BASE + path;

    const finalHeaders = {
      ...headers
    };

    if (auth) {
      Object.assign(finalHeaders, authHeaders());
    }

    // Only JSON encode when body is provided and not FormData
    let payload = body;
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body && !isFormData) {
      finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

    if (!res.ok) {
      const message = data?.message || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // Expose globally
  window.Api = {
    request,
    getToken,
    authHeaders,

    // Auth
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),

    // Dashboard
    dashboardStats: () => request('/dashboard/stats'),
    dashboardCharts: (query) => request(`/dashboard/charts${query ? '?' + query : ''}`),
    dashboardActivities: (query) => request(`/dashboard/activities${query ? '?' + query : ''}`),

    // Products
    listProducts: (query) => request(`/products${query ? '?' + query : ''}`),
    productById: (id) => request(`/products/${id}`),
    createProduct: (payload) => request('/products', { method: 'POST', body: payload }),
    updateProduct: (id, payload) => request(`/products/${id}`, { method: 'PUT', body: payload }),
    deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
    uploadProductImage: (formData) => request('/products/upload-image', { method: 'POST', body: formData }),
    productCategories: () => request('/products/utils/categories', { auth: true }),
    productStatistics: () => request('/products/utils/statistics'),

    // Sales
    listRecentSales: (query) => request(`/sales/recent${query ? '?' + query : ''}`),
    listSales: (query) => request(`/sales${query ? '?' + query : ''}`),
    createSale: (payload) => request('/sales', { method: 'POST', body: payload }),
    saleReceipt: (id) => request(`/sales/${id}/receipt`),
    saleStatistics: (query) => request(`/sales/statistics${query ? '?' + query : ''}`),

    // Customers
    listCustomers: (query) => request(`/customers${query ? '?' + query : ''}`),
    createCustomer: (payload) => request('/customers', { method: 'POST', body: payload }),
    updateCustomer: (id, payload) => request(`/customers/${id}`, { method: 'PUT', body: payload }),
    deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
    customerDetails: (id) => request(`/customers/${id}/details`),
    customerStatistics: () => request('/customers/statistics'),
    customersListAll: (query) => request(`/customers/list/all${query ? '?' + query : ''}`),

    // Logout (client side)
    logout: () => {
      localStorage.removeItem('token');
    }
  };
})();

