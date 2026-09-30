-- ==============================================================================
-- PETTY CASH MANAGEMENT SYSTEM - SUPABASE POSTGRESQL SCHEMA
-- Tight Zoho Books Integration + Real-time Balance Tracking + Storage
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. ZOHO CONFIGURATION & OAUTH CREDENTIALS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zoho_config (
    id INT PRIMARY KEY DEFAULT 1,
    client_id TEXT,
    client_secret TEXT,
    redirect_uri TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    organization_id TEXT,
    organization_name TEXT,
    dc_region TEXT DEFAULT 'com', -- 'com', 'in', 'eu', 'com.au', 'jp', 'ca'
    is_connected BOOLEAN DEFAULT false,
    mock_mode BOOLEAN DEFAULT true, -- Allows full live simulation out of the box
    auto_sync_interval_mins INT DEFAULT 15,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT single_row_config CHECK (id = 1)
);

-- Seed single row if absent
INSERT INTO zoho_config (id, client_id, client_secret, redirect_uri, mock_mode, is_connected)
VALUES (1, '', '', 'http://localhost:5000/api/zoho/callback', true, false)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. ZOHO BOOKS CACHED DATA (COA, Projects, Contacts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS zoho_accounts_cache (
    account_id TEXT PRIMARY KEY,
    account_name TEXT NOT NULL,
    account_code TEXT,
    account_type TEXT NOT NULL, -- 'expense', 'cash', 'bank', 'other_current_asset'
    is_active BOOLEAN DEFAULT true,
    last_synced TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zoho_projects_cache (
    project_id TEXT PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_code TEXT,
    customer_id TEXT,
    customer_name TEXT,
    status TEXT DEFAULT 'active',
    last_synced TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS zoho_contacts_cache (
    contact_id TEXT PRIMARY KEY,
    contact_name TEXT NOT NULL,
    contact_type TEXT NOT NULL, -- 'customer', 'vendor'
    company_name TEXT,
    email TEXT,
    last_synced TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 3. EMPLOYEES & PETTY CASH WALLETS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_user_id UUID, -- Optional link to Supabase auth.users
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    employee_code TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee', 'manager')),
    petty_cash_account_id TEXT, -- Mapped Zoho Books Petty Cash account ID
    petty_cash_account_name TEXT, -- e.g. "Petty Cash - Alex Morgan"
    initial_float NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    current_balance NUMERIC(12,2) NOT NULL DEFAULT 1000.00,
    default_project_id TEXT,
    default_project_name TEXT,
    department TEXT DEFAULT 'Operations',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 4. PETTY CASH TOP-UPS / REPLENISHMENTS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS petty_cash_topups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    topup_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_mode TEXT DEFAULT 'Bank Transfer',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 5. PETTY CASH EXPENSES
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    category_id TEXT NOT NULL, -- Zoho Books expense account ID
    category_name TEXT NOT NULL,
    description TEXT NOT NULL,
    project_id TEXT,
    project_name TEXT,
    customer_id TEXT,
    customer_name TEXT,
    cost_center TEXT,
    receipt_url TEXT,
    receipt_file_name TEXT,
    zoho_journal_id TEXT,
    zoho_journal_number TEXT,
    sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'failed')),
    sync_error TEXT,
    last_synced_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. AUDIT & SYNC LOGS
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sync_type TEXT NOT NULL, -- 'expense_journal', 'coa_sync', 'projects_sync', 'contacts_sync'
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'warning', 'info')),
    details JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 7. RECALCULATE EMPLOYEE BALANCE FUNCTION & TRIGGERS
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_employee_balance()
RETURNS TRIGGER AS $$
DECLARE
    target_emp_id UUID;
    total_spent NUMERIC(12,2);
    total_topup NUMERIC(12,2);
    init_float NUMERIC(12,2);
BEGIN
    IF TG_OP = 'DELETE' THEN
        target_emp_id := OLD.employee_id;
    ELSE
        target_emp_id := NEW.employee_id;
    END IF;

    SELECT initial_float INTO init_float FROM employees WHERE id = target_emp_id;
    SELECT COALESCE(SUM(amount), 0) INTO total_spent FROM expenses WHERE employee_id = target_emp_id;
    SELECT COALESCE(SUM(amount), 0) INTO total_topup FROM petty_cash_topups WHERE employee_id = target_emp_id;

    UPDATE employees 
    SET current_balance = (COALESCE(init_float, 0) + total_topup - total_spent),
        updated_at = now()
    WHERE id = target_emp_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_expense_balance ON expenses;
CREATE TRIGGER trg_expense_balance
AFTER INSERT OR UPDATE OR DELETE ON expenses
FOR EACH ROW EXECUTE FUNCTION update_employee_balance();

DROP TRIGGER IF EXISTS trg_topup_balance ON petty_cash_topups;
CREATE TRIGGER trg_topup_balance
AFTER INSERT OR UPDATE OR DELETE ON petty_cash_topups
FOR EACH ROW EXECUTE FUNCTION update_employee_balance();

-- ------------------------------------------------------------------------------
-- 8. STORAGE BUCKET CONFIGURATION (FOR RECEIPTS)
-- ------------------------------------------------------------------------------
-- Note: Create a public or authenticated bucket named 'receipts' in Supabase Dashboard
-- INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true)
-- ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash_topups ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_accounts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_projects_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE zoho_contacts_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;

-- Allow read/write for service role & authenticated users (customizable based on role)
CREATE POLICY "Public full access during setup" ON employees FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON expenses FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON petty_cash_topups FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON zoho_config FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON zoho_accounts_cache FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON zoho_projects_cache FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON zoho_contacts_cache FOR ALL USING (true);
CREATE POLICY "Public full access during setup" ON sync_logs FOR ALL USING (true);
