// Centralized API client with employee auth and offline queuing support

const BASE_URL = '/api';

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('petty_cash_user') || 'null');
  } catch {
    return null;
  }
}

function getAuthHeaders() {
  const user = getStoredUser();
  const headers = {};
  if (user && user.id) {
    headers['x-employee-id'] = user.id;
    headers['Authorization'] = `Bearer pc-token-${user.id}`;
  }
  return headers;
}

async function fetchWithAuth(url, options = {}) {
  const authHeaders = getAuthHeaders();
  const headers = {
    ...authHeaders,
    ...(options.headers || {})
  };
  return fetch(url, {
    ...options,
    headers
  });
}

async function safeJson(res) {
  try {
    const text = await res.text();
    return JSON.parse(text);
  } catch {
    if (res.status === 401) {
      return { success: false, error: 'Authentication required. Please log in.' };
    }
    if (res.status === 404) {
      return { success: false, error: 'Resource or API route not found (404).' };
    }
    return { success: false, error: `Server response not valid JSON (HTTP ${res.status})` };
  }
}

export const api = {
  // Authentication
  getStoredUser() {
    return getStoredUser();
  },

  async login(identifier, password) {
    // Purge any stale user session & cached expenses before logging in
    localStorage.removeItem('petty_cash_user');
    localStorage.removeItem('cached_expenses');

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });
    const data = await safeJson(res);
    if (data.success && data.employee) {
      const userSession = {
        ...data.employee,
        token: data.token
      };
      localStorage.setItem('petty_cash_user', JSON.stringify(userSession));
      return { success: true, user: userSession };
    }
    return data;
  },

  async getMe() {
    try {
      const res = await fetchWithAuth(`${BASE_URL}/auth/me`);
      const data = await safeJson(res);
      if (data.success && data.employee) {
        const current = getStoredUser() || {};
        const updated = { ...current, ...data.employee };
        localStorage.setItem('petty_cash_user', JSON.stringify(updated));
        return { success: true, user: updated };
      }
      return data;
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async logout() {
    // Purge session synchronously and immediately
    try {
      const user = getStoredUser();
      if (user && user.id) {
        localStorage.removeItem(`cached_expenses_${user.id}`);
      }
      localStorage.removeItem('petty_cash_user');
      localStorage.removeItem('cached_expenses');
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('cached_expenses_')) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    try {
      await fetchWithAuth(`${BASE_URL}/auth/logout`, { method: 'POST' });
    } catch {}

    return { success: true };
  },

  async getDemoAccounts() {
    return { success: true, accounts: [] };
  },

  // Check health
  async checkHealth() {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      return await safeJson(res);
    } catch {
      return { status: 'offline' };
    }
  },

  // Employees
  async getEmployees() {
    const res = await fetchWithAuth(`${BASE_URL}/employees`);
    return await safeJson(res);
  },

  async getEmployee(id) {
    const res = await fetchWithAuth(`${BASE_URL}/employees/${id}`);
    return await safeJson(res);
  },

  async saveEmployee(employee) {
    const method = employee.id ? 'PUT' : 'POST';
    const url = employee.id ? `${BASE_URL}/employees/${employee.id}` : `${BASE_URL}/employees`;
    const res = await fetchWithAuth(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(employee)
    });
    return await safeJson(res);
  },

  async deleteEmployee(id, hard = false) {
    const res = await fetchWithAuth(`${BASE_URL}/employees/${id}?hardDelete=${hard}`, {
      method: 'DELETE'
    });
    return await safeJson(res);
  },

  async topupEmployee(id, amount, notes, paymentMode = 'Bank Transfer') {
    const res = await fetchWithAuth(`${BASE_URL}/employees/${id}/topup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, notes, payment_mode: paymentMode })
    });
    return await safeJson(res);
  },

  async createZohoAccountForEmployee(id) {
    const res = await fetchWithAuth(`${BASE_URL}/employees/${id}/create-zoho-account`, {
      method: 'POST'
    });
    return await safeJson(res);
  },

  // Expenses
  async getExpenses(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
        params.append(k, filters[k]);
      }
    });

    const user = getStoredUser();
    const cacheKey = user && user.id ? `cached_expenses_${user.id}` : 'cached_expenses';

    try {
      const res = await fetchWithAuth(`${BASE_URL}/expenses?${params.toString()}`);
      if (!res.ok) throw new Error('Network error');
      const data = await safeJson(res);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(data.expenses || []));
      } catch (e) {
        console.warn('Storage quota warning', e);
      }
      return data;
    } catch {
      const cached = localStorage.getItem(cacheKey);
      return {
        success: true,
        expenses: cached ? JSON.parse(cached) : [],
        offline: true
      };
    }
  },

  async saveExpense(formData) {
    if (!navigator.onLine) {
      return this.queueOfflineExpense(formData);
    }

    try {
      const res = await fetchWithAuth(`${BASE_URL}/expenses`, {
        method: 'POST',
        body: formData
      });
      return await safeJson(res);
    } catch {
      return this.queueOfflineExpense(formData);
    }
  },

  async updateExpense(id, formData) {
    const res = await fetchWithAuth(`${BASE_URL}/expenses/${id}`, {
      method: 'PUT',
      body: formData
    });
    return await safeJson(res);
  },

  async deleteExpense(id) {
    const res = await fetchWithAuth(`${BASE_URL}/expenses/${id}`, {
      method: 'DELETE'
    });
    return await safeJson(res);
  },

  async retryExpenseSync(id) {
    const res = await fetchWithAuth(`${BASE_URL}/expenses/${id}/retry-sync`, {
      method: 'POST'
    });
    return await safeJson(res);
  },

  // Offline Queue handling
  queueOfflineExpense(formData) {
    const user = getStoredUser();
    const offlineItem = {
      id: 'offline-' + Date.now(),
      employee_id: formData.get('employee_id') || user?.id,
      expense_date: formData.get('expense_date') || new Date().toISOString().split('T')[0],
      amount: parseFloat(formData.get('amount')),
      category_id: formData.get('category_id'),
      category_name: formData.get('category_name'),
      description: formData.get('description'),
      project_id: formData.get('project_id'),
      project_name: formData.get('project_name'),
      customer_id: formData.get('customer_id'),
      customer_name: formData.get('customer_name'),
      sync_status: 'pending',
      created_at: new Date().toISOString()
    };

    const existingQueue = JSON.parse(localStorage.getItem('offline_expense_queue') || '[]');
    existingQueue.push(offlineItem);
    localStorage.setItem('offline_expense_queue', JSON.stringify(existingQueue));

    return {
      success: true,
      offline: true,
      message: 'Expense saved offline as draft. Will auto-sync when online.',
      expense: offlineItem
    };
  },

  getOfflineQueue() {
    return JSON.parse(localStorage.getItem('offline_expense_queue') || '[]');
  },

  async syncOfflineQueue() {
    const queue = this.getOfflineQueue();
    if (!queue.length) return { synced: 0 };

    let synced = 0;
    const remaining = [];

    for (const item of queue) {
      try {
        const formData = new FormData();
        Object.keys(item).forEach(key => {
          if (key !== 'id' && item[key] !== null && item[key] !== undefined) {
            formData.append(key, item[key]);
          }
        });
        const res = await fetchWithAuth(`${BASE_URL}/expenses`, {
          method: 'POST',
          body: formData
        });
        if (res.ok) {
          synced++;
        } else {
          remaining.push(item);
        }
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem('offline_expense_queue', JSON.stringify(remaining));
    return { synced, remaining: remaining.length };
  },

  // Zoho Books Config & Sync
  async getZohoStatus() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/status`);
    return await safeJson(res);
  },

  async getZohoAuthUrl() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/auth-url`);
    return await safeJson(res);
  },

  async updateZohoSettings(settings) {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    return await safeJson(res);
  },

  async triggerZohoSync() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/sync`, {
      method: 'POST'
    });
    return await safeJson(res);
  },

  async getChartOfAccounts() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/chart-of-accounts`);
    return await safeJson(res);
  },

  async getZohoProjects() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/projects`);
    return await safeJson(res);
  },

  async getZohoContacts() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/contacts`);
    return await safeJson(res);
  },

  async getSyncLogs() {
    const res = await fetchWithAuth(`${BASE_URL}/zoho/sync-logs`);
    return await safeJson(res);
  },

  // Reports
  async getReport(filters = {}) {
    const params = new URLSearchParams();
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
        params.append(k, filters[k]);
      }
    });
    const res = await fetchWithAuth(`${BASE_URL}/reports?${params.toString()}`);
    return await safeJson(res);
  },

  getCsvExportUrl(filters = {}) {
    const user = getStoredUser();
    const params = new URLSearchParams();
    if (user && user.id) {
      params.append('auth_user_id', user.id);
    }
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
        params.append(k, filters[k]);
      }
    });
    return `${BASE_URL}/reports/export/csv?${params.toString()}`;
  },

  getPdfExportUrl(filters = {}) {
    const user = getStoredUser();
    const params = new URLSearchParams();
    if (user && user.id) {
      params.append('auth_user_id', user.id);
    }
    Object.keys(filters).forEach(k => {
      if (filters[k] !== undefined && filters[k] !== null && filters[k] !== '') {
        params.append(k, filters[k]);
      }
    });
    return `${BASE_URL}/reports/export/pdf?${params.toString()}`;
  }
};
