import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, Mail, Hash, Building, Briefcase, DollarSign, BookOpen } from 'lucide-react';
import { api } from '../utils/api';

export default function EmployeeModal({
  isOpen,
  onClose,
  employee = null,
  projects = [],
  zohoAccounts = [],
  onSaveEmployee
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [initialFloat, setInitialFloat] = useState('1000');
  const [department, setDepartment] = useState('Operations');
  const [defaultProjectId, setDefaultProjectId] = useState('');
  const [pettyCashAccountId, setPettyCashAccountId] = useState('');
  const [autoCreateZohoAccount, setAutoCreateZohoAccount] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [loadedAccounts, setLoadedAccounts] = useState(zohoAccounts || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-fetch if parent zohoAccounts is empty
  useEffect(() => {
    if (zohoAccounts && zohoAccounts.length > 0) {
      setLoadedAccounts(zohoAccounts);
    } else if (isOpen) {
      api.getChartOfAccounts().then((res) => {
        if (res.success && res.accounts) {
          setLoadedAccounts(res.accounts);
        }
      });
    }
  }, [zohoAccounts, isOpen]);

  // Cash / bank / other current asset accounts for petty cash float mapping
  const cashAccounts = (loadedAccounts.length > 0 ? loadedAccounts : zohoAccounts).filter(a => {
    const t = (a.account_type || '').toLowerCase();
    const n = (a.account_name || '').toLowerCase();
    return t === 'cash' || t === 'bank' || t === 'other_current_asset' || n.includes('petty') || n.includes('cash');
  });

  useEffect(() => {
    if (employee) {
      setName(employee.name || '');
      setEmail(employee.email || '');
      setEmployeeCode(employee.employee_code || '');
      setRole(employee.role || 'employee');
      setInitialFloat(employee.initial_float ? String(employee.initial_float) : '1000');
      setDepartment(employee.department || 'Operations');
      setDefaultProjectId(employee.default_project_id || '');
      setPettyCashAccountId(employee.petty_cash_account_id || '');
      setAutoCreateZohoAccount(false);
      setIsActive(employee.is_active !== false);
    } else {
      setName('');
      setEmail('');
      setEmployeeCode('EMP-' + Math.floor(100 + Math.random() * 900));
      setPassword('');
      setRole('employee');
      setInitialFloat('1000');
      setDepartment('Field Operations');
      setDefaultProjectId(projects.length > 0 ? projects[0].project_id : '');
      setPettyCashAccountId('');
      setAutoCreateZohoAccount(true);
      setIsActive(true);
    }
    setError('');
  }, [employee, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !employeeCode.trim()) {
      setError('Name, email, and employee code are required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const payload = {
        name,
        email,
        employee_code: employeeCode,
        role,
        initial_float: isNaN(parseFloat(initialFloat)) ? 1000 : parseFloat(initialFloat),
        department,
        default_project_id: defaultProjectId || null,
        petty_cash_account_id: pettyCashAccountId || null,
        auto_create_zoho_account: autoCreateZohoAccount,
        is_active: isActive
      };

      if (employee) {
        payload.id = employee.id;
      }
      if (password.trim()) {
        payload.password = password.trim();
      }

      await onSaveEmployee(payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save employee profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {employee ? 'Edit Employee Profile' : 'Add New Team Member'}
              </h3>
              <p className="text-xs text-slate-500">Links dedicated petty cash sub-account in Zoho Books</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Company Email *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex.m@company.com"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Employee Code & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Employee Code *</label>
              <input
                type="text"
                required
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="EMP-004"
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Application Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              >
                <option value="employee">Employee (Submit Expenses)</option>
                <option value="admin">Admin (Manage Team & Reports)</option>
              </select>
            </div>
          </div>

          {/* Login Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Login Password {employee ? '(Leave blank to keep unchanged)' : '*'}
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={employee ? 'Enter new password or leave blank' : 'e.g. emp123'}
              required={!employee}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {employee && (
            <label className="flex items-center space-x-2.5 cursor-pointer mt-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-700">
                Active Employee (Can login and submit expenses)
              </span>
            </label>
          )}

          {/* Account Balance */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Petty Cash Opening Balance (OMR)</label>
            <input
              type="number"
              step="0.001"
              min="0"
              value={initialFloat}
              onChange={(e) => setInitialFloat(e.target.value)}
              placeholder="500.000"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Default Zoho Project */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Default Project (from Zoho Books)</label>
            <select
              value={defaultProjectId}
              onChange={(e) => setDefaultProjectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            >
              <option value="">None / Unassigned (General Operations)</option>
              {projects.map((p) => (
                <option key={p.project_id} value={p.project_id}>
                  {p.project_name} ({p.project_code || 'No Code'})
                </option>
              ))}
            </select>
          </div>

          {/* Zoho Petty Cash Account Mapping */}
          <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                Zoho Books Petty Cash Account
              </span>
            </div>

            {!employee && (
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateZohoAccount}
                  onChange={(e) => setAutoCreateZohoAccount(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-700 font-medium">
                  Auto-create dedicated Petty Cash account in Zoho Books (e.g. "Petty Cash - {name || 'Employee'}")
                </span>
              </label>
            )}

            {(!autoCreateZohoAccount || employee) && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Link Existing Cash Account in Zoho Books
                  </label>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {cashAccounts.length} Cash Accounts Found
                  </span>
                </div>
                <select
                  value={pettyCashAccountId}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    setPettyCashAccountId(selectedId);
                    const selectedAcc = cashAccounts.find(a => a.account_id === selectedId);
                    if (selectedAcc) {
                      setInitialFloat(String(selectedAcc.current_balance || 0));
                    }
                  }}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-xs font-medium focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">-- Select Cash / Petty Cash Account ({cashAccounts.length}) --</option>
                  {cashAccounts.map((a) => (
                    <option key={a.account_id} value={a.account_id}>
                      {a.account_name} {a.account_code ? `[${a.account_code}]` : ''} ({a.account_type?.replace(/_/g, ' ')})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Expenses paid by this user will credit this account in Zoho Books journals.
                </p>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Profile...' : employee ? 'Save Changes' : 'Create Team Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
