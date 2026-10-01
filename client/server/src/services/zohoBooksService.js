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
  async getAuthorizationUrl(req = null) {
    const config = await db.getZohoConfig();
    const { authUrl } = this.getEndpoints(config.dc_region);

    let redirectUri = config.redirect_uri;
    if (req) {
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (host && (!redirectUri || redirectUri.includes('localhost'))) {
        redirectUri = `${protocol}://${host}/api/zoho/callback`;
      }
    }
    if (!redirectUri || redirectUri.includes('localhost')) {
      redirectUri = 'https://pettycash-pearl.vercel.app/api/zoho/callback';
    }

    const params = new URLSearchParams({
      scope: 'ZohoBooks.fullaccess.all',
      client_id: config.client_id || 'demo_client_id',
      response_type: 'code',
      redirect_uri: redirectUri,
      access_type: 'offline',
      prompt: 'consent'
    });
    return `${authUrl}?${params.toString()}`;
  }

  // Exchange Authorization Code for Access & Refresh Tokens
  async handleOAuthCallback(code, req = null) {
    const config = await db.getZohoConfig();
    const { tokenUrl } = this.getEndpoints(config.dc_region);

    let redirectUri = config.redirect_uri;
    if (req) {
      const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      if (host && (!redirectUri || redirectUri.includes('localhost'))) {
        redirectUri = `${protocol}://${host}/api/zoho/callback`;
      }
    }
    if (!redirectUri || redirectUri.includes('localhost')) {
      redirectUri = 'https://pettycash-pearl.vercel.app/api/zoho/callback';
    }

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
          redirect_uri: redirectUri,
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
  async getValidAccessToken(forceRefresh = false) {
    const config = await db.getZohoConfig();
    if (config.mock_mode) {
      return 'mock_token_valid';
    }

    const expiresAt = new Date(config.token_expires_at || 0).getTime();
    const isExpired = Date.now() > (expiresAt - 300000); // 5 minutes grace buffer

    if (!forceRefresh && !isExpired && config.access_token) {
      return config.access_token;
    }

    const refreshToken = (config.refresh_token && !config.refresh_token.includes('demo_'))
      ? config.refresh_token
      : (process.env.ZOHO_REFRESH_TOKEN || '1000.70b3d3f7739447a1b5a16b1d535b0f94.860e4471704192a3fa442619dbd08417');
    const clientId = config.client_id || process.env.ZOHO_CLIENT_ID || '1000.BYLDNDDJMF36HIGK6ZJXGMMYILQ12O';
    const clientSecret = config.client_secret || process.env.ZOHO_CLIENT_SECRET || '834dd49f629f1e095f2858a71217add0571131bd70';

    if (!refreshToken) {
      throw new Error('No refresh token available. Reconnect Zoho Books via OAuth.');
    }

    const { tokenUrl } = this.getEndpoints(config.dc_region);
    try {
      const response = await axios.post(tokenUrl, null, {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        }
      });

      const { access_token, expires_in } = response.data;
      if (!access_token) {
        throw new Error(response.data.error || 'Refresh token response missing access_token');
      }

      await db.updateZohoConfig({
        access_token,
        refresh_token: refreshToken,
        token_expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
      });

      return access_token;
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message;
      await db.addSyncLog('token_refresh', 'failure', {}, errMsg);
      throw new Error(`Failed to refresh Zoho Books token: ${errMsg}`);
    }
  }

  // Make authenticated API request to Zoho Books with auto-refresh on 401/unauthorized
  async makeApiRequest(endpoint, method = 'GET', data = null, customParams = {}, retryCount = 0) {
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
      organization_id: config.organization_id || process.env.ZOHO_ORG_ID || '771750431',
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
      const status = err.response?.status;
      const errCode = err.response?.data?.code;
      const errMsg = err.response?.data?.message || err.message;

      // Auto-retry once on 401 or Zoho authorization code 57 / 14 by force-refreshing the access token
      if (retryCount === 0 && (status === 401 || errCode === 57 || errCode === 14 || errMsg?.toLowerCase().includes('not authorized') || errMsg?.toLowerCase().includes('token'))) {
        console.warn(`🔄 Zoho API unauthorized/expired on [${endpoint}]. Force-refreshing token and retrying...`);
        try {
          await this.getValidAccessToken(true);
          return await this.makeApiRequest(endpoint, method, data, customParams, 1);
        } catch (refreshErr) {
          console.error('Failed to auto-refresh token after 401:', refreshErr.message);
        }
      }

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

      // Synchronize employee ending balances with live Zoho Books petty cash account balances
      try {
        const employees = await db.getEmployees();
        for (const emp of employees) {
          if (emp.petty_cash_account_id) {
            const liveBal = await this.getPettyCashBalance(emp.petty_cash_account_id);
            if (typeof liveBal === 'number') {
              await db.updateEmployeeBalance(emp.id, liveBal);
            }
          }
        }
      } catch (empSyncErr) {
        console.warn('Failed to update employee balances during COA sync:', empSyncErr.message);
      }

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

  // Fetch and synchronize live petty cash expenses from Zoho Books created through this app
  async syncExpensesFromZoho(perPage = 50) {
    try {
      const employees = await db.getEmployees();
      const pcAccountMap = {};
      employees.forEach(emp => {
        if (emp.petty_cash_account_id) {
          pcAccountMap[emp.petty_cash_account_id] = emp;
        }
      });

      const zohoExpenses = [];
      for (const [accountId, emp] of Object.entries(pcAccountMap)) {
        try {
          const res = await this.makeApiRequest('/expenses', 'GET', null, {
            paid_through_account_id: accountId,
            sort_column: 'date',
            sort_order: 'D',
            per_page: perPage
          });
          const list = res.expenses || [];
          for (const ze of list) {
            // STRICT FILTER: Only include expenses logged through this app (tagged with PCA- reference)
            const isFromApp = (ze.reference_number && ze.reference_number.startsWith('PCA-')) ||
              ze.expense_id === '3095712000008878001' ||
              ze.expense_id === '3095712000008868020';

            if (!isFromApp) {
              continue; // Exclude all existing historical expenses
            }

            const localId = ze.reference_number ? ze.reference_number.replace('PCA-', '') : ze.expense_id;
            const existingExp = (await db.getExpenses()).find(e => e.id === localId || e.zoho_journal_id === ze.expense_id);
            let projId = ze.project_id || (existingExp ? existingExp.project_id : null);
            let projName = ze.project_name || (existingExp ? existingExp.project_name : null);

            // Fetch detail from Zoho single-expense API if project is missing from list endpoint
            if (!projId || !projName) {
              try {
                const singleRes = await this.makeApiRequest(`/expenses/${ze.expense_id}`, 'GET');
                if (singleRes && singleRes.expense) {
                  projId = singleRes.expense.project_id || projId;
                  projName = singleRes.expense.project_name || projName;
                }
              } catch (singleErr) {
                console.warn(`Could not fetch details for Zoho expense ${ze.expense_id}:`, singleErr.message);
              }
            }

            // Fallback match project by ID or customer ID from cached Zoho projects
            const cachedProjects = await db.getZohoProjects();
            if (projId && !projName && cachedProjects) {
              const matchedProj = cachedProjects.find(p => String(p.project_id) === String(projId));
              if (matchedProj) projName = matchedProj.project_name;
            }
            if (!projId && ze.customer_id && cachedProjects) {
              const matchedByCust = cachedProjects.find(p => String(p.customer_id) === String(ze.customer_id));
              if (matchedByCust) {
                projId = matchedByCust.project_id;
                projName = matchedByCust.project_name;
              }
            }

            zohoExpenses.push({
              id: localId,
              employee_id: emp.id,
              employee_name: emp.name,
              expense_date: ze.date,
              amount: parseFloat(ze.total || ze.bcy_total || 0),
              category_id: ze.account_id || '3095712000000000460',
              category_name: ze.account_name || 'Other Expenses',
              paid_through_account_id: ze.paid_through_account_id || accountId,
              paid_through_account_name: ze.paid_through_account_name || emp.petty_cash_account_name,
              description: ze.description || ze.account_name || 'Petty cash purchase',
              project_id: projId || null,
              project_name: projName || null,
              customer_id: ze.customer_id || null,
              customer_name: ze.customer_name || null,
              cost_center: null,
              receipt_url: null,
              receipt_file_name: ze.expense_receipt_name || null,
              zoho_journal_id: ze.expense_id,
              zoho_journal_number: (ze.custom_field_hash && ze.custom_field_hash.cf_expenses_no) || ze.cf_expenses_no || ze.expense_number || 'N/A',
              sync_status: 'synced',
              sync_error: null,
              last_synced_at: new Date().toISOString(),
              created_by: emp.name
            });
          }
        } catch (accErr) {
          console.warn(`Could not sync expenses for account ${accountId}:`, accErr.message);
        }
      }

      // Merge into local cache
      for (const ze of zohoExpenses) {
        await db.saveExpense(ze);
      }

      await db.addSyncLog('expenses_sync', 'success', { count: zohoExpenses.length });
      return zohoExpenses;
    } catch (err) {
      console.warn('syncExpensesFromZoho failed:', err.message);
      return [];
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
      customer_id: expense.customer_id || undefined,
      reference_number: expense.id ? (expense.id.startsWith('PCA-') ? expense.id : `PCA-${expense.id}`) : `PCA-${Date.now()}`
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
