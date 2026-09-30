const axios = require('axios');
const { db } = require('../config/supabase');

class ZohoBooksService {
  // Map DC to endpoints
  getEndpoints(region = 'com') {
    const dc = (region || 'com').toLowerCase();
    switch (dc) {
      case 'in':
        return {
          authUrl: 'https://accounts.zoho.in/oauth/v2/auth',
          tokenUrl: 'https://accounts.zoho.in/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.in/books/v3'
        };
      case 'eu':
        return {
          authUrl: 'https://accounts.zoho.eu/oauth/v2/auth',
          tokenUrl: 'https://accounts.zoho.eu/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.eu/books/v3'
        };
      case 'com.au':
      case 'au':
        return {
          authUrl: 'https://accounts.zoho.com.au/oauth/v2/auth',
          tokenUrl: 'https://accounts.zoho.com.au/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.com.au/books/v3'
        };
      case 'jp':
        return {
          authUrl: 'https://accounts.zoho.jp/oauth/v2/auth',
          tokenUrl: 'https://accounts.zoho.jp/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.jp/books/v3'
        };
      case 'ca':
        return {
          authUrl: 'https://accounts.zohocloud.ca/oauth/v2/auth',
          tokenUrl: 'https://accounts.zohocloud.ca/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.ca/books/v3'
        };
      default:
        return {
          authUrl: 'https://accounts.zoho.com/oauth/v2/auth',
          tokenUrl: 'https://accounts.zoho.com/oauth/v2/token',
          apiUrl: 'https://www.zohoapis.com/books/v3'
        };
    }
  }

  // Generate OAuth 2.0 Authorization URL
  async getAuthorizationUrl() {
    const config = await db.getZohoConfig();
    const { authUrl } = this.getEndpoints(config.dc_region);
    const params = new URLSearchParams({
      scope: 'ZohoBooks.fullaccess.all',
      client_id: config.client_id || 'demo_client_id',
      response_type: 'code',
      redirect_uri: config.redirect_uri || 'http://localhost:5000/api/zoho/callback',
      access_type: 'offline',
      prompt: 'consent'
    });
    return `${authUrl}?${params.toString()}`;
  }

  // Exchange Authorization Code for Access & Refresh Tokens
  async handleOAuthCallback(code) {
    const config = await db.getZohoConfig();
    const { tokenUrl } = this.getEndpoints(config.dc_region);

    if (config.mock_mode || !config.client_secret || config.client_secret.includes('dummy')) {
      console.log('🔄 [Zoho Mock] Simulating OAuth 2.0 token exchange for code:', code);
      const simulatedToken = 'mock_at_' + Math.random().toString(36).substring(2);
      const simulatedRefresh = 'mock_rt_' + Math.random().toString(36).substring(2);
      await db.updateZohoConfig({
        access_token: simulatedToken,
        refresh_token: simulatedRefresh,
        token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        is_connected: true
      });
      await db.addSyncLog('oauth_connect', 'success', { simulated: true });
      return { success: true, message: 'Connected to Zoho Books (Simulated Sandbox)' };
    }

    try {
      const response = await axios.post(tokenUrl, null, {
        params: {
          code,
          client_id: config.client_id,
          client_secret: config.client_secret,
          redirect_uri: config.redirect_uri,
          grant_type: 'authorization_code'
        }
      });

      const { access_token, refresh_token, expires_in } = response.data;
      if (!access_token) {
        throw new Error(response.data.error || 'Failed to exchange token');
      }

      await db.updateZohoConfig({
        access_token,
        refresh_token: refresh_token || config.refresh_token,
        token_expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString(),
        is_connected: true
      });

      await db.addSyncLog('oauth_connect', 'success', { expires_in });
      return { success: true, message: 'Successfully connected to Zoho Books' };
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      await db.addSyncLog('oauth_connect', 'failure', {}, errMsg);
      throw new Error(`Zoho OAuth Error: ${errMsg}`);
    }
  }

  // Ensure valid access token, auto-refreshing via refresh_token when necessary
  async getValidAccessToken() {
    const config = await db.getZohoConfig();
    if (config.mock_mode) {
      return 'mock_token_valid';
    }

    const expiresAt = new Date(config.token_expires_at || 0).getTime();
    const isExpired = Date.now() > (expiresAt - 300000); // 5 minutes grace buffer

    if (!isExpired && config.access_token) {
      return config.access_token;
    }

    if (!config.refresh_token) {
      throw new Error('No refresh token available. Reconnect Zoho Books via OAuth.');
    }

    const { tokenUrl } = this.getEndpoints(config.dc_region);
    try {
      const response = await axios.post(tokenUrl, null, {
        params: {
          refresh_token: config.refresh_token,
          client_id: config.client_id,
          client_secret: config.client_secret,
          grant_type: 'refresh_token'
        }
      });

      const { access_token, expires_in } = response.data;
      if (!access_token) {
        throw new Error('Refresh token response missing access_token');
      }

      await db.updateZohoConfig({
        access_token,
        token_expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
      });

      return access_token;
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      await db.addSyncLog('token_refresh', 'failure', {}, errMsg);
      throw new Error(`Failed to refresh Zoho Books token: ${errMsg}`);
    }
  }

  // Make authenticated API request to Zoho Books
  async makeApiRequest(endpoint, method = 'GET', data = null, customParams = {}) {
    const config = await db.getZohoConfig();

    if (config.mock_mode) {
      return this.handleMockApiRequest(endpoint, method, data);
    }

    const token = await this.getValidAccessToken();
    const { apiUrl } = this.getEndpoints(config.dc_region);

    const headers = {
      Authorization: `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json'
    };

    const params = {
      organization_id: config.organization_id,
      ...customParams
    };

    try {
      const response = await axios({
        url: `${apiUrl}${endpoint}`,
        method,
        headers,
        params,
        data
      });
      return response.data;
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      throw new Error(`Zoho API Request Error [${endpoint}]: ${errMsg}`);
    }
  }

  // Handle Mock API simulation for offline/sandbox testing
  async handleMockApiRequest(endpoint, method, data) {
    if (endpoint.startsWith('/chartofaccounts')) {
      if (method === 'GET') {
        const accounts = await db.getZohoAccounts();
        
        // Handle specific account fetch: /chartofaccounts/{id}
        const match = endpoint.match(/\/chartofaccounts\/(.+)/);
        if (match && match[1]) {
          const accId = match[1];
          const acc = accounts.find(a => a.account_id === accId);
          if (acc) {
            return {
              code: 0,
              chart_of_account: {
                ...acc,
                closing_balance: acc.current_balance || Math.floor(Math.random() * 500) + 50
              }
            };
          }
          return { code: 1002, message: 'Account not found' };
        }

        const withBalances = accounts.map(a => ({
          ...a,
          current_balance: a.current_balance || Math.floor(Math.random() * 500) + 50 // Give a random mock balance for testing
        }));
        return { code: 0, chartofaccounts: withBalances };
      }
      if (method === 'POST') {
        const newAcc = {
          account_id: 'acc-pc-' + Math.floor(100 + Math.random() * 900),
          account_name: data.account_name,
          account_code: data.account_code || '1010-99',
          account_type: data.account_type || 'cash'
        };
        const current = await db.getZohoAccounts();
        current.push(newAcc);
        await db.setZohoAccounts(current);
        return { code: 0, chart_of_account: newAcc };
      }
    }

    if (endpoint.startsWith('/projects')) {
      const projects = await db.getZohoProjects();
      return { code: 0, projects };
    }

    if (endpoint.startsWith('/contacts')) {
      const contacts = await db.getZohoContacts();
      return { code: 0, contacts };
    }

    if (endpoint.startsWith('/journals')) {
      if (method === 'POST') {
        const jId = 'jn-' + Math.floor(800000 + Math.random() * 100000);
        const jNum = 'JRN-' + new Date().getFullYear() + '-' + String(Math.floor(1000 + Math.random() * 9000));
        return {
          code: 0,
          journal: {
            journal_id: jId,
            journal_number: jNum,
            ...data
          }
        };
      }
      if (method === 'PUT') {
        return { code: 0, message: 'Journal updated successfully in Zoho Books' };
      }
      if (method === 'DELETE') {
        return { code: 0, message: 'Journal deleted successfully in Zoho Books' };
      }
    }

    return { code: 0, message: 'Mock response success' };
  }

  // Sync Chart of Accounts from Zoho Books
  async syncChartOfAccounts() {
    try {
      const response = await this.makeApiRequest('/chartofaccounts', 'GET');
      const rawAccounts = response.chartofaccounts || [];
      const mapped = rawAccounts.map(acc => ({
        account_id: acc.account_id,
        account_name: acc.account_name,
        account_code: acc.account_code || '',
        account_type: acc.account_type,
        is_active: acc.is_active !== false,
        current_balance: acc.current_balance !== undefined ? acc.current_balance : (acc.balance !== undefined ? acc.balance : 0),
        last_synced: new Date().toISOString()
      }));

      await db.setZohoAccounts(mapped);
      await db.addSyncLog('coa_sync', 'success', { count: mapped.length });
      return mapped;
    } catch (err) {
      await db.addSyncLog('coa_sync', 'failure', {}, err.message);
      throw err;
    }
  }

  // Fetch the live balance for a specific petty cash account
  async getPettyCashBalance(accountId) {
    try {
      const response = await this.makeApiRequest(`/chartofaccounts/${accountId}`, 'GET');
      if (response && response.chart_of_account) {
        if (response.chart_of_account.closing_balance !== undefined) {
          return response.chart_of_account.closing_balance;
        }
      }
      return null;
    } catch (err) {
      console.warn(`Failed to fetch live balance for ${accountId}:`, err.message);
      return null;
    }
  }

  // Sync Projects from Zoho Books
  async syncProjects() {
    try {
      const response = await this.makeApiRequest('/projects', 'GET');
      const rawProjects = response.projects || [];
      const mapped = rawProjects.map(proj => ({
        project_id: proj.project_id,
        project_name: proj.project_name,
        project_code: proj.project_code || '',
        customer_id: proj.customer_id || null,
        customer_name: proj.customer_name || '',
        status: proj.status || 'active',
        last_synced: new Date().toISOString()
      }));

      await db.setZohoProjects(mapped);
      await db.addSyncLog('projects_sync', 'success', { count: mapped.length });
      return mapped;
    } catch (err) {
      await db.addSyncLog('projects_sync', 'failure', {}, err.message);
      throw err;
    }
  }

  // Sync Contacts (Customers & Vendors) from Zoho Books
  async syncContacts() {
    try {
      const response = await this.makeApiRequest('/contacts', 'GET');
      const rawContacts = response.contacts || [];
      const mapped = rawContacts.map(c => ({
        contact_id: c.contact_id,
        contact_name: c.contact_name,
        contact_type: c.contact_type || 'customer',
        company_name: c.company_name || '',
        email: c.email || '',
        last_synced: new Date().toISOString()
      }));

      await db.setZohoContacts(mapped);
      await db.addSyncLog('contacts_sync', 'success', { count: mapped.length });
      return mapped;
    } catch (err) {
      await db.addSyncLog('contacts_sync', 'failure', {}, err.message);
      throw err;
    }
  }

  // Create or link Petty Cash Account for an Employee in Zoho Books
  async createEmployeePettyCashAccount(employee) {
    const accountName = `Petty Cash - ${employee.name}`;
    const accountCode = `PC-${employee.employee_code || Math.floor(100 + Math.random() * 900)}`;

    const payload = {
      account_name: accountName,
      account_code: accountCode,
      account_type: 'cash',
      description: `Dedicated employee petty cash float for ${employee.name} (${employee.employee_code})`
    };

    try {
      const response = await this.makeApiRequest('/chartofaccounts', 'POST', payload);
      const created = response.chart_of_account || response;
      await db.addSyncLog('create_petty_cash_account', 'success', {
        employee_id: employee.id,
        account_id: created.account_id,
        account_name: accountName
      });
      return created;
    } catch (err) {
      await db.addSyncLog('create_petty_cash_account', 'failure', { employee_id: employee.id }, err.message);
      throw err;
    }
  }

  // Push Expense to Zoho Books as a native Expense
  async createExpenseJournal(expense, employee) {
    if (!employee.petty_cash_account_id) {
      throw new Error(`Employee ${employee.name} does not have an assigned Zoho Petty Cash Account.`);
    }

    const payload = {
      account_id: expense.category_id || '3095712000000000460',
      paid_through_account_id: employee.petty_cash_account_id,
      date: expense.expense_date,
      amount: parseFloat(expense.amount),
      description: expense.description || 'Petty cash purchase',
      project_id: expense.project_id || undefined,
      customer_id: expense.customer_id || undefined
    };

    try {
      const response = await this.makeApiRequest('/expenses', 'POST', payload);
      const zExpense = response.expense || response;
      const expenseId = zExpense.expense_id || `exp-sim-${Date.now()}`;
      const expenseNumber = (zExpense.custom_field_hash && zExpense.custom_field_hash.cf_expenses_no) || zExpense.expense_number || 'N/A';

      await db.addSyncLog('expense_create', 'success', {
        expense_id: expense.id,
        zoho_expense_id: expenseId,
        zoho_expense_number: expenseNumber
      });

      return {
        zoho_journal_id: expenseId,
        zoho_journal_number: expenseNumber
      };
    } catch (err) {
      await db.addSyncLog('expense_create', 'failure', { expense_id: expense.id }, err.message);
      throw err;
    }
  }

  // Update existing Expense in Zoho Books
  async updateExpenseJournal(expense, employee) {
    if (!expense.zoho_journal_id) {
      return this.createExpenseJournal(expense, employee);
    }

    const payload = {
      account_id: expense.category_id || '3095712000000000460',
      paid_through_account_id: employee.petty_cash_account_id,
      date: expense.expense_date,
      amount: parseFloat(expense.amount),
      description: expense.description,
      project_id: expense.project_id || undefined,
      customer_id: expense.customer_id || undefined
    };

    try {
      await this.makeApiRequest(`/expenses/${expense.zoho_journal_id}`, 'PUT', payload);
      await db.addSyncLog('expense_update', 'success', { expense_id: expense.id, zoho_expense_id: expense.zoho_journal_id });
      return { zoho_journal_id: expense.zoho_journal_id, zoho_journal_number: expense.zoho_journal_number };
    } catch (err) {
      await db.addSyncLog('expense_update', 'failure', { expense_id: expense.id }, err.message);
      throw err;
    }
  }

  // Delete Expense in Zoho Books
  async deleteExpenseJournal(journalId) {
    if (!journalId) return;
    try {
      await this.makeApiRequest(`/expenses/${journalId}`, 'DELETE');
      await db.addSyncLog('expense_delete', 'success', { zoho_expense_id: journalId });
      return true;
    } catch (err) {
      await db.addSyncLog('expense_delete', 'failure', { zoho_expense_id: journalId }, err.message);
      throw err;
    }
  }
}

module.exports = new ZohoBooksService();
