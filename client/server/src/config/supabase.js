const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

let supabase = null;
let isLiveSupabase = false;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-supabase')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    // Verify if tables actually exist before enabling Supabase mode
    supabase
      .from('employees')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (!error) {
          isLiveSupabase = true;
          console.log('✅ Supabase PostgreSQL tables verified and active');
        } else {
          isLiveSupabase = false;
          console.log('ℹ️ Running in Local Data Store mode (Supabase schema tables not yet migrated).');
        }
      })
      .catch(() => {
        isLiveSupabase = false;
      });
  } catch (err) {
    console.warn('⚠️ Could not initialize Supabase client:', err.message);
  }
} else {
  console.log('ℹ️ Running in Supabase Local Store Mode. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env to connect to live PostgreSQL.');
}

// Local data storage path with fallback to bundled data-store
const BUNDLED_DB_FILE = path.resolve(__dirname, '../../data-store.json');
const DB_FILE = process.env.VERCEL === '1'
  ? path.join('/tmp', 'data-store.json')
  : (fs.existsSync(BUNDLED_DB_FILE) ? BUNDLED_DB_FILE : path.join(process.cwd(), 'server', 'data-store.json'));

const initialSeedData = {
  zoho_config: {
    id: 1,
    client_id: process.env.ZOHO_CLIENT_ID || '1000.BYLDNDDJMF36HIGK6ZJXGMMYILQ12O',
    client_secret: process.env.ZOHO_CLIENT_SECRET || '834dd49f629f1e095f2858a71217add0571131bd70',
    redirect_uri: process.env.ZOHO_REDIRECT_URI || 'https://pettycash-pearl.vercel.app/api/zoho/callback',
    access_token: '1000.37c17b6d6392ec9d9eb5bc267639ee1d.17f99b72a0567184b754bc53248c5e84',
    refresh_token: process.env.ZOHO_REFRESH_TOKEN || '1000.70b3d3f7739447a1b5a16b1d535b0f94.860e4471704192a3fa442619dbd08417',
    token_expires_at: '2026-09-30T20:40:44.409Z',
    organization_id: process.env.ZOHO_ORG_ID || '771750431',
    organization_name: 'Bright Flowers Trading LLC',
    dc_region: 'com',
    is_connected: true,
    mock_mode: false,
    auto_sync_interval_mins: 15,
    default_expense_account_id: 'acc-exp-petty',
    default_expense_account_name: 'Petty Cash Purchases',
    last_sync_at: new Date().toISOString()
  },
  employees: [
    {
      id: 'emp-9fe07453',
      name: 'Kumaresan',
      email: 'kumaresan@company.com',
      employee_code: 'EMP-803',
      password: 'admin123',
      role: 'admin',
      initial_float: 203.732,
      current_balance: 203.732,
      department: 'Field Operations',
      default_project_id: null,
      default_project_name: null,
      petty_cash_account_id: '3095712000002049033',
      petty_cash_account_name: 'Kumaresan Petty Cash',
      is_active: true,
      created_at: '2026-09-30T20:00:54.188Z'
    },
    {
      id: 'emp-bbcdae95',
      name: 'Nihal',
      email: 'nihal@company.com',
      employee_code: 'EMP-502',
      password: 'emp123',
      role: 'employee',
      initial_float: 40.76,
      current_balance: 40.76,
      department: 'Field Operations',
      default_project_id: null,
      default_project_name: null,
      petty_cash_account_id: '3095712000001367590',
      petty_cash_account_name: 'Nihal Petty Cash',
      is_active: true,
      created_at: '2026-09-30T16:40:43.579Z'
    }
  ],
  zoho_accounts: [
    { account_id: 'acc-exp-petty', account_name: 'Petty Cash Purchases', account_code: '6000', account_type: 'expense' },
    { account_id: 'acc-exp-01', account_name: 'Travel & Local Conveyance', account_code: '6010', account_type: 'expense' },
    { account_id: 'acc-exp-02', account_name: 'Site Refreshments & Meals', account_code: '6020', account_type: 'expense' },
    { account_id: 'acc-exp-03', account_name: 'Office & Site Supplies', account_code: '6030', account_type: 'expense' },
    { account_id: 'acc-exp-04', account_name: 'Courier & Postage', account_code: '6040', account_type: 'expense' },
    { account_id: 'acc-exp-05', account_name: 'Emergency Repairs & Hardware', account_code: '6050', account_type: 'expense' },
    { account_id: 'acc-exp-06', account_name: 'Printing & Stationery', account_code: '6060', account_type: 'expense' },
    { account_id: 'acc-bank-main', account_name: 'Main Operating Bank Account', account_code: '1001', account_type: 'bank' }
  ],
  zoho_projects: [
    { project_id: 'proj-101', project_name: 'Metro Transit Hub Phase 2', project_code: 'PRJ-MTH', customer_id: 'cust-201', customer_name: 'City Infrastructure Corp', status: 'active' },
    { project_id: 'proj-102', project_name: 'Skyline Tower Renovations', project_code: 'PRJ-STR', customer_id: 'cust-202', customer_name: 'Apex Real Estate Partners', status: 'active' },
    { project_id: 'proj-103', project_name: 'Green Energy Solar Park', project_code: 'PRJ-GES', customer_id: 'cust-203', customer_name: 'TerraPower Solutions', status: 'active' },
    { project_id: 'proj-104', project_name: 'Internal Operations & Facilities', project_code: 'PRJ-INT', customer_id: null, customer_name: 'Internal', status: 'active' }
  ],
  zoho_contacts: [
    { contact_id: 'cust-201', contact_name: 'City Infrastructure Corp', contact_type: 'customer', company_name: 'City Infrastructure Corp', email: 'billing@cityinfra.gov' },
    { contact_id: 'cust-202', contact_name: 'Apex Real Estate Partners', contact_type: 'customer', company_name: 'Apex Real Estate', email: 'accounts@apexre.com' },
    { contact_id: 'cust-203', contact_name: 'TerraPower Solutions', contact_type: 'customer', company_name: 'TerraPower', email: 'finance@terrapower.com' },
    { contact_id: 'vend-301', contact_name: 'Shell Fuel Stations', contact_type: 'vendor', company_name: 'Shell Oil Co', email: 'commercial@shell.com' },
    { contact_id: 'vend-302', contact_name: 'Home Depot Supplies', contact_type: 'vendor', company_name: 'The Home Depot', email: 'pro@homedepot.com' },
    { contact_id: 'vend-303', contact_name: 'Uber For Business', contact_type: 'vendor', company_name: 'Uber Technologies', email: 'receipts@uber.com' }
  ],
  expenses: [],
  sync_logs: [
    {
      id: 'log-1',
      sync_type: 'coa_sync',
      status: 'success',
      details: { accounts_synced: 10 },
      error_message: null,
      created_at: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: 'log-2',
      sync_type: 'projects_sync',
      status: 'success',
      details: { projects_synced: 4 },
      error_message: null,
      created_at: new Date(Date.now() - 500000).toISOString()
    }
  ]
};

// Initialize file if not existing
function loadLocalData() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      if (fs.existsSync(BUNDLED_DB_FILE)) {
        try {
          const bundledRaw = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
          fs.writeFileSync(DB_FILE, bundledRaw, 'utf-8');
          return JSON.parse(bundledRaw);
        } catch (copyErr) {
          console.warn('Could not copy bundled DB_FILE:', copyErr.message);
        }
      }
      try {
        fs.writeFileSync(DB_FILE, JSON.stringify(initialSeedData, null, 2), 'utf-8');
      } catch (wErr) {
        console.warn('Could not initialize local DB_FILE:', wErr.message);
      }
      return initialSeedData;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    // Merge bundled real tokens and projects if parsed lacks them
    if (fs.existsSync(BUNDLED_DB_FILE)) {
      try {
        const bundled = JSON.parse(fs.readFileSync(BUNDLED_DB_FILE, 'utf-8'));
        let needsSave = false;
        if (!parsed.zoho_config?.refresh_token && bundled.zoho_config?.refresh_token) {
          parsed.zoho_config.refresh_token = bundled.zoho_config.refresh_token;
          parsed.zoho_config.access_token = bundled.zoho_config.access_token;
          parsed.zoho_config.is_connected = true;
          needsSave = true;
        }
        if ((!parsed.zoho_projects || parsed.zoho_projects.length < 5) && bundled.zoho_projects?.length) {
          parsed.zoho_projects = bundled.zoho_projects;
          needsSave = true;
        }
        if ((!parsed.zoho_accounts || parsed.zoho_accounts.length < 5) && bundled.zoho_accounts?.length) {
          parsed.zoho_accounts = bundled.zoho_accounts;
          needsSave = true;
        }
        if (needsSave) {
          saveLocalData(parsed);
        }
      } catch (mErr) {}
    }

    return parsed;
  } catch (err) {
    console.error('Error loading local data store:', err.message);
    return initialSeedData;
  }
}

function saveLocalData(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving local data store:', err.message);
  }
}

// Unified Database Access Layer
const db = {
  get isLive() {
    return isLiveSupabase;
  },
  supabase,

  async getZohoConfig() {
    let cfg = null;
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('zoho_config').select('*').eq('id', 1).single();
      if (!error && data) cfg = data;
    }
    if (!cfg) {
      const store = loadLocalData();
      cfg = store.zoho_config;
    }
    // Always let active process.env override client_id, client_secret, org_id, and dc_region if provided
    return {
      ...cfg,
      client_id: process.env.ZOHO_CLIENT_ID || cfg?.client_id,
      client_secret: process.env.ZOHO_CLIENT_SECRET || cfg?.client_secret,
      redirect_uri: process.env.ZOHO_REDIRECT_URI || cfg?.redirect_uri,
      organization_id: process.env.ZOHO_ORG_ID || cfg?.organization_id,
      dc_region: process.env.ZOHO_DC || cfg?.dc_region || 'com',
      refresh_token: process.env.ZOHO_REFRESH_TOKEN || cfg?.refresh_token
    };
  },

  async updateZohoConfig(updates) {
    if (isLiveSupabase) {
      await supabase.from('zoho_config').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 1);
    }
    const store = loadLocalData();
    store.zoho_config = { ...store.zoho_config, ...updates, updated_at: new Date().toISOString() };
    saveLocalData(store);
    return store.zoho_config;
  },

  async getEmployees() {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('employees').select('*').order('name');
      if (!error && data) return data;
    }
    const store = loadLocalData();
    return store.employees;
  },

  async getEmployeeById(id) {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('employees').select('*').eq('id', id).single();
      if (!error && data) return data;
    }
    const store = loadLocalData();
    return store.employees.find(e => e.id === id);
  },

  async saveEmployee(employee) {
    if (isLiveSupabase) {
      const { data, error } = await supabase.from('employees').upsert(employee).select().single();
      if (!error && data) return data;
    }
    const store = loadLocalData();
    const idx = store.employees.findIndex(e => e.id === employee.id);
    if (idx >= 0) {
      store.employees[idx] = { ...store.employees[idx], ...employee, updated_at: new Date().toISOString() };
    } else {
      const startFloat = employee.initial_float !== undefined ? employee.initial_float : 1000;
      store.employees.push({
        ...employee,
        initial_float: startFloat,
        current_balance: startFloat,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    saveLocalData(store);
    
    // Recalculate balance if it was an update and expenses might exist
    if (idx >= 0) {
      await this.recalculateBalance(employee.id);
      return this.getEmployeeById(employee.id);
    }
    
    return store.employees[store.employees.length - 1];
  },

  async deleteEmployee(id) {
    if (isLiveSupabase) {
      await supabase.from('employees').delete().eq('id', id);
    }
    const store = loadLocalData();
    store.employees = store.employees.filter(e => e.id !== id);
    saveLocalData(store);
    return true;
  },

  async recalculateBalance(employeeId) {
    const store = loadLocalData();
    const emp = store.employees.find(e => e.id === employeeId);
    if (!emp) return;

    // Do NOT recalculate or overwrite balance for employees linked to a Zoho Books petty cash account.
    // The balance is strictly controlled by Zoho Books live closing balance.
    if (emp.petty_cash_account_id) {
      return;
    }

    const totalSpent = store.expenses
      .filter(ex => ex.employee_id === employeeId)
      .reduce((sum, ex) => sum + parseFloat(ex.amount || 0), 0);

    emp.current_balance = (parseFloat(emp.initial_float || 0) - totalSpent);
    saveLocalData(store);

    if (isLiveSupabase) {
      try {
        await supabase.from('employees').update({ current_balance: emp.current_balance }).eq('id', employeeId);
      } catch {}
    }
  },

  async updateEmployeeBalance(employeeId, newBalance) {
    const store = loadLocalData();
    const emp = store.employees.find(e => e.id === employeeId);
    if (emp) {
      emp.current_balance = parseFloat(newBalance);
      emp.updated_at = new Date().toISOString();
      saveLocalData(store);
    }

    if (isLiveSupabase) {
      await supabase.from('employees').update({ current_balance: parseFloat(newBalance) }).eq('id', employeeId);
    }
  },

  async getExpenses(filters = {}) {
    let list = [];
    if (isLiveSupabase) {
      let query = supabase.from('expenses').select('*').order('expense_date', { ascending: false });
      if (filters.employee_id) query = query.eq('employee_id', filters.employee_id);
      if (filters.project_id) query = query.eq('project_id', filters.project_id);
      if (filters.start_date) query = query.gte('expense_date', filters.start_date);
      if (filters.end_date) query = query.lte('expense_date', filters.end_date);
      const { data, error } = await query;
      if (!error && data) list = data;
    } else {
      const store = loadLocalData();
      list = [...store.expenses];
      if (filters.employee_id) list = list.filter(e => e.employee_id === filters.employee_id);
      if (filters.project_id) list = list.filter(e => e.project_id === filters.project_id);
      if (filters.start_date) list = list.filter(e => e.expense_date >= filters.start_date);
      if (filters.end_date) list = list.filter(e => e.expense_date <= filters.end_date);
      if (filters.search) {
        const s = filters.search.toLowerCase();
        list = list.filter(e =>
          (e.description && e.description.toLowerCase().includes(s)) ||
          (e.category_name && e.category_name.toLowerCase().includes(s)) ||
          (e.employee_name && e.employee_name.toLowerCase().includes(s))
        );
      }
      list.sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date));
    }
    return list;
  },

  async getExpenseById(id) {
    if (isLiveSupabase) {
      const { data } = await supabase.from('expenses').select('*').eq('id', id).single();
      if (data) return data;
    }
    const store = loadLocalData();
    return store.expenses.find(e => e.id === id);
  },

  async saveExpense(expense) {
    const store = loadLocalData();
    const emp = store.employees.find(e => e.id === expense.employee_id);
    if (emp) {
      expense.employee_name = emp.name;
    }

    if (isLiveSupabase) {
      const { data, error } = await supabase.from('expenses').upsert(expense).select().single();
      if (!error && data) {
        await this.recalculateBalance(expense.employee_id);
        return data;
      }
    }

    const idx = store.expenses.findIndex(e => e.id === expense.id);
    if (idx >= 0) {
      store.expenses[idx] = { ...store.expenses[idx], ...expense, updated_at: new Date().toISOString() };
    } else {
      store.expenses.unshift({
        ...expense,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }
    saveLocalData(store);
    await this.recalculateBalance(expense.employee_id);
    return idx >= 0 ? store.expenses[idx] : store.expenses[0];
  },

  async deleteExpense(id) {
    const store = loadLocalData();
    const exp = store.expenses.find(e => e.id === id);
    const empId = exp ? exp.employee_id : null;

    if (isLiveSupabase) {
      await supabase.from('expenses').delete().eq('id', id);
    }

    store.expenses = store.expenses.filter(e => e.id !== id);
    saveLocalData(store);

    if (empId) {
      await this.recalculateBalance(empId);
    }
    return true;
  },

  async getZohoAccounts() {
    if (isLiveSupabase) {
      const { data } = await supabase.from('zoho_accounts_cache').select('*');
      if (data && data.length) return data;
    }
    const store = loadLocalData();
    return store.zoho_accounts;
  },

  async setZohoAccounts(accounts) {
    if (isLiveSupabase) {
      try {
        await supabase.from('zoho_accounts_cache').upsert(accounts);
      } catch (err) {
        console.warn('Supabase accounts upsert notice:', err.message);
      }
    }
    const store = loadLocalData();
    store.zoho_accounts = accounts;
    saveLocalData(store);
  },

  async getZohoProjects() {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('zoho_projects_cache').select('*');
        if (!error && data && data.length) return data;
      } catch (err) {
        console.warn('Supabase projects query notice:', err.message);
      }
    }
    const store = loadLocalData();
    return store.zoho_projects || [];
  },

  async setZohoProjects(projects) {
    if (isLiveSupabase) {
      try {
        await supabase.from('zoho_projects_cache').upsert(projects);
      } catch (err) {
        console.warn('Supabase projects upsert notice:', err.message);
      }
    }
    const store = loadLocalData();
    store.zoho_projects = projects;
    saveLocalData(store);
  },

  async getZohoContacts() {
    if (isLiveSupabase) {
      try {
        const { data, error } = await supabase.from('zoho_contacts_cache').select('*');
        if (!error && data && data.length) return data;
      } catch (err) {
        console.warn('Supabase contacts query notice:', err.message);
      }
    }
    const store = loadLocalData();
    return store.zoho_contacts || [];
  },

  async setZohoContacts(contacts) {
    if (isLiveSupabase) {
      try {
        await supabase.from('zoho_contacts_cache').upsert(contacts);
      } catch (err) {
        console.warn('Supabase contacts upsert notice:', err.message);
      }
    }
    const store = loadLocalData();
    store.zoho_contacts = contacts;
    saveLocalData(store);
  },

  async addSyncLog(type, status, details = {}, errorMessage = null) {
    const log = {
      id: 'log-' + Date.now(),
      sync_type: type,
      status,
      details,
      error_message: errorMessage,
      created_at: new Date().toISOString()
    };
    if (isLiveSupabase) {
      await supabase.from('sync_logs').insert(log);
    }
    const store = loadLocalData();
    store.sync_logs.unshift(log);
    if (store.sync_logs.length > 50) store.sync_logs = store.sync_logs.slice(0, 50);
    saveLocalData(store);
    return log;
  },

  async getSyncLogs() {
    if (isLiveSupabase) {
      const { data } = await supabase.from('sync_logs').select('*').order('created_at', { ascending: false }).limit(30);
      if (data) return data;
    }
    const store = loadLocalData();
    return store.sync_logs;
  }
};

module.exports = { db, supabase, isLiveSupabase };
