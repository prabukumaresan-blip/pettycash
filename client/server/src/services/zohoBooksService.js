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

    // Deduplicate concurrent token refresh requests
    if (this._refreshPromise) {
      return await this._refreshPromise;
    }

    const now = Date.now();
    // Protect against rapid multiple refreshes (Zoho allows max 1 refresh per minute; reuse valid token within 45s)
    if (this._lastRefreshSuccessTime && (now - this._lastRefreshSuccessTime < 45000)) {
      if (config.access_token) {
        return config.access_token;
      }
    }

    // Cooldown if rate-limited recently (avoid repeated rapid re-firing)
    if (this._lastRefreshErrorTime && (now - this._lastRefreshErrorTime < 30000)) {
      if (config.access_token) {
        return config.access_token; // Use current token if available instead of hammering rate limit
      }
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

    this._refreshPromise = (async () => {
      try {
        const response = await axios.post(tokenUrl, null, {
          params: {
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token'
          },
          timeout: 6000
        });

        const { access_token, expires_in } = response.data;
        if (!access_token) {
          throw new Error(response.data.error || 'Refresh token response missing access_token');
        }

        this._lastRefreshSuccessTime = Date.now();
        this._lastRefreshErrorTime = null;
        await db.updateZohoConfig({
          access_token,
          refresh_token: refreshToken,
          token_expires_at: new Date(Date.now() + (expires_in || 3600) * 1000).toISOString()
        });

        return access_token;
      } catch (err) {
        this._lastRefreshErrorTime = Date.now();
        const errMsg = err.response?.data?.error_description || err.response?.data?.error || err.message;
        await db.addSyncLog('token_refresh', 'failure', {}, errMsg);
        throw new Error(`Failed to refresh Zoho Books token: ${errMsg}`);
      } finally {
        this._refreshPromise = null;
      }
    })();

    return await this._refreshPromise;
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
        data,
        timeout: 6000
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
            const accMatch = rawAccounts.find(a => String(a.account_id) === String(emp.petty_cash_account_id));
            if (accMatch && (accMatch.closing_balance !== undefined || accMatch.bcy_closing_balance !== undefined || accMatch.current_balance !== undefined)) {
              const rawBal = parseFloat(accMatch.closing_balance ?? accMatch.bcy_closing_balance ?? accMatch.current_balance ?? 0);
              const bal = (accMatch.isdebit === false && rawBal > 0) ? -rawBal : rawBal;
              if (!this._balanceCache) this._balanceCache = {};
              this._balanceCache[emp.petty_cash_account_id] = { balance: bal, timestamp: Date.now() };
              await db.updateEmployeeBalance(emp.id, bal);
            } else {
              const liveBal = await this.getPettyCashBalance(emp.petty_cash_account_id);
              if (typeof liveBal === 'number') {
                await db.updateEmployeeBalance(emp.id, liveBal);
              }
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

  // Fetch the live balance for a specific petty cash account (with caching to prevent Zoho rate-limit blocks)
  async getPettyCashBalance(accountId, forceRefresh = false) {
    if (!this._balanceCache) this._balanceCache = {};
    const cached = this._balanceCache[accountId];
    if (!forceRefresh && cached && (Date.now() - cached.timestamp < 120000)) {
      return cached.balance;
    }

    try {
      const response = await this.makeApiRequest(`/chartofaccounts/${accountId}`, 'GET');
      if (response && response.chart_of_account) {
        const coa = response.chart_of_account;
        if (coa.closing_balance !== undefined || coa.bcy_closing_balance !== undefined) {
          const rawBal = parseFloat(coa.closing_balance ?? coa.bcy_closing_balance ?? 0);
          let bal = rawBal;
          if (coa.isdebit === false && rawBal > 0) {
            bal = -rawBal;
          }
          this._balanceCache[accountId] = { balance: bal, timestamp: Date.now() };
          return bal;
        }
      }
      return cached ? cached.balance : null;
    } catch (err) {
      console.warn(`Notice on live balance fetch for ${accountId}:`, err.message);
      return cached ? cached.balance : null;
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
      const accounts = await db.getZohoAccounts();
      const allLocalExpenses = await db.getExpenses();
      const cachedProjects = (await db.getZohoProjects()) || [];

      // Pre-index local expenses for fast O(1) matching
      const existingByJournalId = new Map();
      const existingByRef = new Map();
      const existingByInvoice = new Map();
      const existingById = new Map();

      for (const e of allLocalExpenses) {
        if (e.zoho_journal_id) existingByJournalId.set(String(e.zoho_journal_id), e);
        if (e.id) {
          existingByRef.set(String(e.id), e);
          existingById.set(String(e.id), e);
        }
        if (e.employee_id && e.invoice_number) existingByInvoice.set(`${e.employee_id}_${e.invoice_number}`, e);
      }

      // Pre-index cached projects for fast O(1) lookup
      const projectById = new Map(cachedProjects.map(p => [String(p.project_id), p]));
      const projectByCustomer = new Map(
        cachedProjects.filter(p => p.customer_id).map(p => [String(p.customer_id), p])
      );

      const pcAccountMap = {};

      for (const emp of employees) {
        // Auto-resolve missing or misconfigured petty cash account for ANY employee
        if (!emp.petty_cash_account_id || emp.petty_cash_account_id === '3095712000009241002') {
          const matched = (accounts || []).find(acc => {
            const accName = (acc.account_name || '').toLowerCase();
            const empName = (emp.name || '').toLowerCase();
            const empEmailPrefix = (emp.email || '').split('@')[0].toLowerCase();
            return (accName.includes(empName) || accName.includes(empEmailPrefix)) &&
              (accName.includes('petty') || accName.includes('cash') || acc.account_type === 'cash' || acc.account_type === 'other_current_asset');
          });
          if (matched) {
            emp.petty_cash_account_id = matched.account_id;
            emp.petty_cash_account_name = matched.account_name;
            await db.saveEmployee(emp);
          } else if (emp.email === 'shaibani@company.com' || (emp.name && emp.name.toLowerCase().includes('shaibani'))) {
            emp.petty_cash_account_id = '3095712000008522002';
            emp.petty_cash_account_name = 'Ibrahim AL Shaibani';
            await db.saveEmployee(emp);
          }
        }
        if (emp.petty_cash_account_id) {
          pcAccountMap[emp.petty_cash_account_id] = emp;
        }
      }

      const zohoExpenses = [];
      const accountsList = Object.entries(pcAccountMap);
      const allActiveZohoExpenseIds = new Set();

      for (const [accountId, emp] of accountsList) {
        try {
          const res = await this.makeApiRequest('/expenses', 'GET', null, {
            paid_through_account_id: accountId,
            sort_column: 'date',
            sort_order: 'D',
            per_page: perPage
          });
          const list = res.expenses || [];
          let accountNewExpenses = 0;

          // Index all active Zoho expense IDs and references for this account
          const accountActiveZohoIds = new Set();
          const accountActiveRefs = new Set();
          for (const ze of list) {
            accountActiveZohoIds.add(String(ze.expense_id));
            allActiveZohoExpenseIds.add(String(ze.expense_id));
            if (ze.reference_number) accountActiveRefs.add(String(ze.reference_number));
          }

          // DETECT EXPENSES DELETED IN ZOHO BOOKS:
          // Check all local expenses for this employee/account that were synced to Zoho Books.
          // If they no longer exist in Zoho Books (even if marked as exported), delete them locally!
          const syncedLocalForAccount = allLocalExpenses.filter(e => {
            const matchesEmp = e.employee_id === emp.id;
            const matchesAcc = e.paid_through_account_id === accountId;
            const wasSynced = Boolean(e.zoho_journal_id) || e.sync_status === 'synced';
            return (matchesEmp || matchesAcc) && wasSynced;
          });

          for (const locExp of syncedLocalForAccount) {
            const inActiveList = (locExp.zoho_journal_id && accountActiveZohoIds.has(String(locExp.zoho_journal_id))) ||
                                 (locExp.invoice_number && accountActiveRefs.has(String(locExp.invoice_number))) ||
                                 (locExp.id && (accountActiveRefs.has(String(locExp.id)) || accountActiveRefs.has(`PCA-${locExp.id}`)));

            if (!inActiveList) {
              // Not in active Zoho expenses list for this account.
              // Double check single expense endpoint in Zoho to confirm deletion
              let isConfirmedDeleted = false;
              if (locExp.zoho_journal_id) {
                try {
                  const checkRes = await this.makeApiRequest(`/expenses/${locExp.zoho_journal_id}`, 'GET');
                  if (!checkRes || !checkRes.expense) {
                    isConfirmedDeleted = true;
                  } else if (checkRes.expense.paid_through_account_id !== accountId) {
                    isConfirmedDeleted = true;
                  }
                } catch (checkErr) {
                  const errMsg = (checkErr.message || '').toLowerCase();
                  if (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('1002') || errMsg.includes('404')) {
                    isConfirmedDeleted = true;
                  }
                }
              } else {
                isConfirmedDeleted = true;
              }

              if (isConfirmedDeleted) {
                console.log(`🗑️ [Zoho Sync] Expense ${locExp.id} (Zoho ID: ${locExp.zoho_journal_id || 'N/A'}, Exported: ${Boolean(locExp.is_exported)}) was deleted in Zoho Books. Deleting local record...`);
                await db.deleteExpense(locExp.id);
                if (locExp.zoho_journal_id && String(locExp.zoho_journal_id) !== String(locExp.id)) {
                  await db.deleteExpense(locExp.zoho_journal_id);
                }
                accountNewExpenses++;
              }
            }
          }

          for (const ze of list) {
            // Skip any expense that was deleted by the user
            if (db.isDeletedExpense && db.isDeletedExpense(null, ze.expense_id)) {
              continue;
            }
            const isRecentCreated = ze.created_time && new Date(ze.created_time) >= new Date('2026-10-20T00:00:00Z');
            const isRecentDate = ze.date && ze.date >= '2026-10-20';
            const isAppRef = ze.reference_number && ze.reference_number.startsWith('PCA-');

            // Fast in-memory lookup
            const existingExp = existingByJournalId.get(String(ze.expense_id)) ||
              (ze.reference_number && ze.reference_number.startsWith('PCA-') ? existingByRef.get(ze.reference_number.replace('PCA-', '')) : null) ||
              (ze.reference_number ? existingByInvoice.get(`${emp.id}_${ze.reference_number}`) : null);

            const isTracked = Boolean(existingExp);
            const isFromApp = isAppRef ||
              isTracked ||
              isRecentDate ||
              isRecentCreated ||
              ze.expense_id === '3095712000008878001' ||
              ze.expense_id === '3095712000008868020' ||
              ze.expense_id === '3095712000009255001' ||
              ze.expense_id === '3095712000009256001';

            if (!isFromApp) {
              continue; // Exclude ancient historical expenses
            }

            if (!existingExp) {
              accountNewExpenses++;
            }

            let localId = existingExp 
              ? existingExp.id 
              : (ze.reference_number && ze.reference_number.startsWith('PCA-') 
                  ? ze.reference_number.replace('PCA-', '') 
                  : `exp-${ze.expense_id.slice(-7)}`);

            let counter = 1;
            while (
              (existingById.has(localId) && existingById.get(localId).zoho_journal_id && String(existingById.get(localId).zoho_journal_id) !== String(ze.expense_id)) ||
              zohoExpenses.some(zeItem => zeItem.id === localId && zeItem.zoho_journal_id !== ze.expense_id)
            ) {
              localId = `exp-${ze.expense_id.slice(-7)}-${counter++}`;
            }

            let projId = ze.project_id || (existingExp ? existingExp.project_id : null);
            let projName = ze.project_name || (existingExp ? existingExp.project_name : null);
            let custId = ze.customer_id || (existingExp ? existingExp.customer_id : null);
            let custName = ze.customer_name || (existingExp ? existingExp.customer_name : null);
            let singleResDetail = null;

            // Prioritize cached project lookup by ID or customer ID
            if (projId && !projName && projectById.has(String(projId))) {
              projName = projectById.get(String(projId)).project_name;
            }
            if (!projId && (custId || ze.customer_id)) {
              const targetCustId = custId || ze.customer_id;
              if (projectByCustomer.has(String(targetCustId))) {
                const matched = projectByCustomer.get(String(targetCustId));
                projId = matched.project_id;
                projName = matched.project_name;
              }
            }

            // Only fetch detail from Zoho single-expense API if completely NEW expense, missing project, and within rate-limit budget
            if (!existingExp && (!projId || !projName) && accountNewExpenses <= 3) {
              try {
                const singleRes = await this.makeApiRequest(`/expenses/${ze.expense_id}`, 'GET');
                if (singleRes && singleRes.expense) {
                  singleResDetail = singleRes.expense;
                  projId = singleResDetail.project_id || projId;
                  projName = singleResDetail.project_name || projName;
                  custId = singleResDetail.customer_id || custId;
                  custName = singleResDetail.customer_name || custName;
                }
              } catch (singleErr) {
                // Silently skip to protect sync flow
              }
            }

            const expNumber = (ze.custom_field_hash && ze.custom_field_hash.cf_expenses_no) || 
              ze.cf_expenses_no || 
              (singleResDetail && singleResDetail.custom_field_hash && singleResDetail.custom_field_hash.cf_expenses_no) ||
              ze.expense_number || 
              (existingExp ? existingExp.zoho_journal_number : null) ||
              'N/A';

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
              description: ze.description || (singleResDetail && singleResDetail.description) || ze.account_name || 'Petty cash purchase',
              project_id: projId || null,
              project_name: projName || null,
              customer_id: custId || ze.customer_id || null,
              customer_name: custName || ze.customer_name || null,
              invoice_number: (existingExp ? existingExp.invoice_number : null) || (ze.reference_number && !ze.reference_number.startsWith('PCA-') ? ze.reference_number : null),
              cost_center: null,
              receipt_url: existingExp?.receipt_url || null,
              receipt_file_name: existingExp?.receipt_file_name || ze.expense_receipt_name || (singleResDetail && singleResDetail.expense_receipt_name) || null,
              zoho_journal_id: ze.expense_id,
              zoho_journal_number: expNumber,
              sync_status: 'synced',
              sync_error: null,
              last_synced_at: new Date().toISOString(),
              added_to_report: existingExp?.added_to_report !== undefined ? existingExp.added_to_report : false,
              added_to_report_at: existingExp?.added_to_report ? existingExp.added_to_report_at : null,
              is_exported: existingExp?.is_exported !== undefined ? existingExp.is_exported : false,
              exported_at: existingExp?.exported_at || null,
              recall_status: existingExp?.recall_status || null,
              created_by: emp.name
            });
          }

          // Only fetch live closing balance if genuine new expenses were found or balance is not yet cached
          if (accountNewExpenses > 0 || emp.current_balance === undefined || emp.current_balance === null) {
            try {
              const liveBal = await this.getPettyCashBalance(accountId);
              if (typeof liveBal === 'number') {
                await db.updateEmployeeBalance(emp.id, liveBal);
              }
            } catch (balErr) {
              console.warn(`Could not sync live balance for account ${accountId}:`, balErr.message);
            }
          }
        } catch (accErr) {
          console.warn(`Could not sync expenses for account ${accountId}:`, accErr.message);
        }
        // Small delay between employee accounts to respect Zoho API rate limits
        await new Promise(r => setTimeout(r, 100));
      }

      // Global sweep: Check any other local expenses marked as synced with Zoho
      // that weren't found in ANY active account list (handles account changes/re-assignments)
      try {
        const currentLocal = await db.getExpenses();
        const orphanedSynced = currentLocal.filter(e => e.zoho_journal_id && !allActiveZohoExpenseIds.has(String(e.zoho_journal_id)));
        for (const orphan of orphanedSynced) {
          try {
            const singleRes = await this.makeApiRequest(`/expenses/${orphan.zoho_journal_id}`, 'GET');
            if (!singleRes || !singleRes.expense) {
              console.log(`🗑️ [Zoho Sync] Orphaned expense ${orphan.id} (Zoho ID: ${orphan.zoho_journal_id}, Exported: ${Boolean(orphan.is_exported)}) deleted from Zoho Books. Removing locally...`);
              await db.deleteExpense(orphan.id);
            }
          } catch (checkErr) {
            const errMsg = (checkErr.message || '').toLowerCase();
            if (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('1002') || errMsg.includes('404')) {
              console.log(`🗑️ [Zoho Sync] Confirmed deleted from Zoho Books: ${orphan.id} (Zoho ID: ${orphan.zoho_journal_id}, Exported: ${Boolean(orphan.is_exported)}). Removing locally...`);
              await db.deleteExpense(orphan.id);
            }
          }
        }
      } catch (sweepErr) {
        console.warn('Global deletion sweep notice:', sweepErr.message);
      }

      // Merge into local cache using fast batch save
      if (zohoExpenses.length > 0) {
        await db.saveExpensesBatch(zohoExpenses);
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
    let accountId = employee.petty_cash_account_id;
    if (!accountId || accountId === '3095712000009241002') {
      const accounts = await db.getZohoAccounts();
      const matched = (accounts || []).find(acc => {
        const accName = (acc.account_name || '').toLowerCase();
        const empName = (employee.name || '').toLowerCase();
        const empEmailPrefix = (employee.email || '').split('@')[0].toLowerCase();
        return (accName.includes(empName) || accName.includes(empEmailPrefix)) &&
          (accName.includes('petty') || accName.includes('cash') || acc.account_type === 'cash' || acc.account_type === 'other_current_asset');
      });

      if (matched) {
        accountId = matched.account_id;
        employee.petty_cash_account_id = matched.account_id;
        employee.petty_cash_account_name = matched.account_name;
        await db.saveEmployee(employee);
      } else if (employee.email === 'shaibani@company.com' || (employee.name && employee.name.toLowerCase().includes('shaibani'))) {
        accountId = '3095712000008522002';
        employee.petty_cash_account_id = '3095712000008522002';
        employee.petty_cash_account_name = 'Ibrahim AL Shaibani';
        await db.saveEmployee(employee);
      } else {
        throw new Error(`Employee ${employee.name} does not have a valid assigned Zoho Petty Cash Account.`);
      }
    }

    const payload = {
      account_id: expense.category_id || '3095712000000000460',
      paid_through_account_id: accountId,
      date: expense.expense_date,
      amount: parseFloat(expense.amount),
      description: expense.description || 'Petty cash purchase',
      project_id: expense.project_id || undefined,
      customer_id: expense.customer_id || undefined,
      reference_number: expense.invoice_number ? expense.invoice_number : (expense.id ? (expense.id.startsWith('PCA-') ? expense.id : `PCA-${expense.id}`) : `PCA-${Date.now()}`)
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
      console.warn(`Zoho expense creation warning for expense ${expense.id}: ${err.message}`);
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
      customer_id: expense.customer_id || undefined,
      reference_number: expense.invoice_number ? expense.invoice_number : (expense.id ? (expense.id.startsWith('PCA-') ? expense.id : `PCA-${expense.id}`) : `PCA-${Date.now()}`)
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
    if (!journalId) return true;
    try {
      await this.makeApiRequest(`/expenses/${journalId}`, 'DELETE');
      await db.addSyncLog('expense_delete', 'success', { zoho_expense_id: journalId });
      return true;
    } catch (err) {
      const errMsg = (err.message || '').toLowerCase();
      // If the expense already does not exist in Zoho Books, treat as success
      if (errMsg.includes('does not exist') || errMsg.includes('not found') || errMsg.includes('404')) {
        console.log(`ℹ️ Expense ${journalId} already does not exist in Zoho Books`);
        await db.addSyncLog('expense_delete', 'success', { zoho_expense_id: journalId, note: 'already deleted' });
        return true;
      }
      await db.addSyncLog('expense_delete', 'failure', { zoho_expense_id: journalId }, err.message);
      throw err;
    }
  }
}

module.exports = new ZohoBooksService();
