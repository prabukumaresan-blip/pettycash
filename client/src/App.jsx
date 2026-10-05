import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import OfflineBanner from './components/OfflineBanner';
import LogExpenseModal from './components/LogExpenseModal';
import EmployeeModal from './components/EmployeeModal';
import DashboardView from './views/DashboardView';
import ReportsView from './views/ReportsView';
import EmployeesView from './views/EmployeesView';
import ZohoSettingsView from './views/ZohoSettingsView';
import LoginView from './views/LoginView';
import { api } from './utils/api';

export default function App() {
  // Authentication & Active User
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [employees, setEmployees] = useState([]);
  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [expenses, setExpenses] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const user = api.getStoredUser();
      const cacheKey = user && user.id ? `cached_expenses_${user.id}` : 'cached_expenses';
      const cached = localStorage.getItem(cacheKey) || localStorage.getItem('cached_expenses');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [zohoStatus, setZohoStatus] = useState(null);
  const [categories, setCategories] = useState([]);
  const [zohoAccounts, setZohoAccounts] = useState([]);
  const [projects, setProjects] = useState([]);

  // Connectivity & Offline
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);

  // Modals
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Check existing session on launch
  useEffect(() => {
    const stored = api.getStoredUser();
    if (stored) {
      api.getMe()
        .then((res) => {
          if (res.success && res.user && api.getStoredUser()) {
            setCurrentUser(res.user);
            setCurrentEmployee(res.user);
          } else {
            api.logout();
            setCurrentUser(null);
            setCurrentEmployee(null);
          }
        })
        .catch(() => {
          if (api.getStoredUser()) {
            setCurrentUser(stored);
            setCurrentEmployee(stored);
          }
        })
        .finally(() => {
          setIsAuthChecking(false);
        });
    } else {
      setIsAuthChecking(false);
    }

    // Check OAuth return params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('zoho_connected') === 'true') {
        showToast('Successfully authenticated with Zoho Books! Real sync active.', 'success');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (urlParams.get('zoho_error')) {
        showToast('Zoho OAuth Error: ' + urlParams.get('zoho_error'), 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  // Sync offline queue
  const handleSyncOfflineQueue = async () => {
    setIsSyncingOffline(true);
    try {
      const res = await api.syncOfflineQueue();
      if (res.synced > 0) {
        showToast(`Successfully pushed ${res.synced} offline expenses to Zoho Books!`);
        await loadAllData();
      }
      setOfflineQueue(api.getOfflineQueue());
    } catch (err) {
      console.error('Offline queue sync error:', err);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Network restored. Syncing offline drafts...', 'info');
      handleSyncOfflineQueue();
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('You are currently offline. Drafts will be stored locally.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setOfflineQueue(api.getOfflineQueue());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load All Core Data scoped to logged-in user
  const loadAllData = useCallback(async (userOverride = null) => {
    const stored = api.getStoredUser();
    const user = userOverride || currentUser || stored;
    if (!user || !stored) return;

    try {
      // 1. Employees (strictly resolve active employee to the logged in user)
      const empRes = await api.getEmployees();
      if (!api.getStoredUser()) return; // Abort if user logged out while request was in-flight
      if (empRes.success && empRes.employees) {
        setEmployees(empRes.employees);
        const self = empRes.employees.find((e) => e.id === user.id || (e.email && e.email.toLowerCase() === user.email?.toLowerCase())) || user;
        setCurrentEmployee(self);
        try {
          const currentStored = api.getStoredUser();
          if (currentStored && currentStored.id === self.id) {
            localStorage.setItem('petty_cash_user', JSON.stringify({ ...currentStored, ...self }));
          }
        } catch {}
      }

      if (!api.getStoredUser()) return;

      // 2. Expenses (backend enforces employee_id scoping for regular employees)
      const expRes = await api.getExpenses();
      if (!api.getStoredUser()) return;
      if (expRes.success && Array.isArray(expRes.expenses)) {
        if (expRes.expenses.length > 0) {
          setExpenses(expRes.expenses);
        } else {
          setExpenses(prev => (prev.length > 0 ? prev : []));
        }
      }

      // 3. Zoho Status (Admin only)
      if (user.role === 'admin') {
        const zRes = await api.getZohoStatus();
        if (!api.getStoredUser()) return;
        if (zRes.success) {
          setZohoStatus(zRes);
        }
      }

      // 4. Zoho Chart of Accounts
      const coaRes = await api.getChartOfAccounts();
      if (!api.getStoredUser()) return;
      if (coaRes.success) {
        if (coaRes.accounts) setZohoAccounts(coaRes.accounts);
        if (coaRes.expense_accounts) setCategories(coaRes.expense_accounts);
      }

      // 5. Zoho Projects (synced with Zoho Books)
      const projRes = await api.getZohoProjects();
      if (!api.getStoredUser()) return;
      if (projRes.success && projRes.projects) {
        setProjects(projRes.projects);
      }
    } catch (err) {
      console.warn('Initial data load warning:', err.message);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && api.getStoredUser()) {
      loadAllData();
    }
  }, [currentUser, loadAllData]);

  // Real-time automatic data sync on window focus / re-entry
  useEffect(() => {
    if (!currentUser) return;
    const handleSyncOnFocus = () => {
      if (document.visibilityState === 'visible' && api.getStoredUser()) {
        loadAllData();
      }
    };
    window.addEventListener('visibilitychange', handleSyncOnFocus);
    window.addEventListener('focus', handleSyncOnFocus);
    // Real-time interval refresh (every 45s) for live balance & projects without manual clicks
    const interval = setInterval(() => {
      if (api.getStoredUser()) {
        loadAllData();
      }
    }, 45000);

    return () => {
      window.removeEventListener('visibilitychange', handleSyncOnFocus);
      window.removeEventListener('focus', handleSyncOnFocus);
      clearInterval(interval);
    };
  }, [currentUser, loadAllData]);

  // Safety: reset restricted tabs if non-admin
  useEffect(() => {
    if (currentUser && currentUser.role === 'employee') {
      if (activeTab === 'employees' || activeTab === 'settings') {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  // Handle Login Success (Clear prior state, switch user, load fresh data & trigger auto-sync)
  const handleLoginSuccess = async (user) => {
    setEmployees([]);
    setExpenses([]);
    setZohoAccounts([]);
    setCategories([]);
    setProjects([]);
    setZohoStatus(null);
    setCurrentUser(user);
    setCurrentEmployee(user);
    setActiveTab('dashboard');
    showToast(`Welcome back, ${user.name}!`);

    // Load initial user data
    await loadAllData(user);

    // Auto-trigger Zoho sync after login to fetch live balances & accounts
    api.triggerZohoSync()
      .then((res) => {
        if (res && res.success && api.getStoredUser()) {
          loadAllData(user);
        }
      })
      .catch((err) => {
        console.warn('Post-login Zoho sync notice:', err.message);
      });
  };

  // Handle Logout (Clean all state across device synchronously and immediately)
  const handleLogout = () => {
    // 1. Immediately wipe localStorage tokens & cached sessions
    try {
      localStorage.removeItem('petty_cash_user');
      localStorage.removeItem('cached_expenses');
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('cached_expenses_')) {
          localStorage.removeItem(k);
        }
      }
    } catch {}

    // 2. Immediately reset all React states so UI instantly switches to LoginView
    setCurrentUser(null);
    setCurrentEmployee(null);
    setEmployees([]);
    setExpenses([]);
    setZohoStatus(null);
    setZohoAccounts([]);
    setCategories([]);
    setProjects([]);
    setActiveTab('dashboard');

    // 3. Fire server logout in the background
    api.logout().catch(() => {});
    showToast('Signed out successfully.');
  };

  // Handle Full Zoho Manual Sync Trigger
  const handleTriggerFullSync = async () => {
    setIsFullSyncing(true);
    try {
      const res = await api.triggerZohoSync();
      if (res.success) {
        showToast('Zoho Books synchronization completed!');
        await loadAllData();
      }
    } catch (err) {
      showToast('Sync error: ' + err.message, 'error');
    } finally {
      setIsFullSyncing(false);
    }
  };

  // Handle Saving Expense
  const handleSaveExpense = async (formData, expenseId = null) => {
    if (expenseId) {
      const res = await api.updateExpense(expenseId, formData);
      if (res.success) {
        showToast('Expense updated & synced with Zoho Books!');
        if (res.expense) {
          setExpenses((prev) => prev.map((e) => (e.id === expenseId ? res.expense : e)));
        }
      }
    } else {
      const res = await api.saveExpense(formData);
      if (res.offline) {
        showToast('Saved offline. Will sync with Zoho when connected.', 'warning');
        setOfflineQueue(api.getOfflineQueue());
      } else if (res.success) {
        showToast(
          res.synced
            ? 'Expense saved & posted to Zoho Books!'
            : 'Expense saved! Zoho Books sync queued in background.'
        );
        // Immediately add newly saved expense to the Recent Activity list!
        if (res.expense) {
          setExpenses((prev) => [res.expense, ...prev.filter((e) => e.id !== res.expense.id)]);
        }
      }
    }
    await loadAllData();
  };

  // Handle Deleting Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? This will reverse the expense entry in Zoho Books.')) {
      return;
    }
    try {
      const res = await api.deleteExpense(id);
      if (res.success) {
        showToast('Expense deleted and cash balance restored', 'success');
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        await loadAllData();
      } else {
        showToast(res.error || 'Failed to delete expense', 'error');
      }
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
    }
  };

  // Handle Requesting Call Back (Recall) of Exported Expense
  const handleRequestExpenseRecall = async (expense) => {
    const isAdmin = currentUser?.role === 'admin';
    if (isAdmin) {
      if (!window.confirm(`Admin Call Back: Unlock expense "${expense.description}" from the exported report?`)) {
        return;
      }
      try {
        const res = await api.requestExpenseRecall(expense.id, 'Admin direct call back');
        if (res.success) {
          showToast('Expense called back and unlocked from report.', 'success');
          await loadAllData();
        } else {
          showToast(res.error || 'Failed to call back expense', 'error');
        }
      } catch (err) {
        showToast('Call back error: ' + err.message, 'error');
      }
    } else {
      const reason = window.prompt(
        `Request Admin approval to call back expense "${expense.description}" from the report.\nEnter reason:`,
        'Correction required'
      );
      if (reason === null) return;
      try {
        const res = await api.requestExpenseRecall(expense.id, reason);
        if (res.success) {
          showToast('Call back request submitted. Waiting for Admin approval.', 'success');
          await loadAllData();
        } else {
          showToast(res.error || 'Failed to submit call back request', 'error');
        }
      } catch (err) {
        showToast('Call back error: ' + err.message, 'error');
      }
    }
  };

  // Handle Admin Approving Call Back
  const handleApproveExpenseRecall = async (id) => {
    try {
      const res = await api.approveExpenseRecall(id);
      if (res.success) {
        showToast('Call back approved! Expense is now unlocked from the report.', 'success');
        await loadAllData();
      } else {
        showToast(res.error || 'Failed to approve call back', 'error');
      }
    } catch (err) {
      showToast('Approval error: ' + err.message, 'error');
    }
  };

  // Handle Admin Rejecting Call Back
  const handleRejectExpenseRecall = async (id) => {
    try {
      const res = await api.rejectExpenseRecall(id);
      if (res.success) {
        showToast('Call back request rejected.', 'info');
        await loadAllData();
      } else {
        showToast(res.error || 'Failed to reject call back', 'error');
      }
    } catch (err) {
      showToast('Rejection error: ' + err.message, 'error');
    }
  };

  // Handle Retrying Expense Sync
  const handleRetrySync = async (id) => {
    try {
      const res = await api.retryExpenseSync(id);
      if (res.success) {
        showToast('Journal entry created in Zoho Books!');
        await loadAllData();
      }
    } catch (err) {
      showToast('Sync retry failed: ' + err.message, 'error');
    }
  };

  // Handle Adding or Removing Expenses from Expense Report
  const handleUpdateExpenseReportStatus = async (expenseIds, addedToReport) => {
    try {
      const res = await api.updateExpensesReportStatus(expenseIds, addedToReport);
      if (res.success) {
        setExpenses((prev) =>
          prev.map((e) =>
            expenseIds.includes(e.id)
              ? {
                  ...e,
                  added_to_report: addedToReport,
                  added_to_report_at: addedToReport ? new Date().toISOString() : null
                }
              : e
          )
        );
        showToast(
          addedToReport
            ? `Added ${expenseIds.length} expense(s) to the Expense Report!`
            : `Removed ${expenseIds.length} expense(s) from the Expense Report.`,
          'success'
        );
        return true;
      } else {
        showToast(res.error || 'Failed to update report status', 'error');
        return false;
      }
    } catch (err) {
      showToast('Report status error: ' + err.message, 'error');
      return false;
    }
  };

  // Handle Saving Employee (Admin only)
  const handleSaveEmployee = async (employeeData) => {
    try {
      const res = await api.saveEmployee(employeeData);
      if (res.success) {
        showToast(employeeData.id ? 'Employee updated successfully!' : 'New employee & Zoho Petty Cash account created!');
        await loadAllData();
        return res;
      } else {
        throw new Error(res.error || 'Failed to save employee profile');
      }
    } catch (err) {
      showToast(err.message, 'error');
      throw err;
    }
  };

  // Handle Deleting Employee (Admin only)
  const handleDeleteEmployee = async (id, isHardDelete = false) => {
    const msg = isHardDelete 
      ? 'Are you sure you want to permanently delete this team member? This action cannot be undone.'
      : 'Are you sure you want to deactivate this team member?';
    if (!window.confirm(msg)) return;
    try {
      const res = await api.deleteEmployee(id, isHardDelete);
      if (res.success) {
        showToast(isHardDelete ? 'Employee permanently deleted' : 'Employee deactivated');
        await loadAllData();
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };

  // Handle Auto-creating Zoho Petty Cash account (Admin only)
  const handleCreateZohoAccountForEmployee = async (id) => {
    try {
      const res = await api.createZohoAccountForEmployee(id);
      if (res.success) {
        showToast('Zoho Petty Cash account linked: ' + res.employee.petty_cash_account_name);
        await loadAllData();
      }
    } catch (err) {
      showToast('Could not link Zoho account: ' + err.message, 'error');
    }
  };

  // Auth checking splash
  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4"></div>
        <div className="text-sm font-bold text-slate-300">Loading Petty Cash Portal...</div>
      </div>
    );
  }

  // Not logged in -> Show Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-20 md:pb-8">
      {/* Offline Alert Banner */}
      <OfflineBanner
        offlineCount={offlineQueue.length}
        onSyncOffline={handleSyncOfflineQueue}
        isSyncing={isSyncingOffline}
      />

      {/* Navigation Header */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        zohoStatus={zohoStatus}
        isOnline={isOnline}
        offlineCount={offlineQueue.length}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            currentEmployee={currentEmployee || currentUser}
            currentUser={currentUser}
            expenses={expenses}
            onOpenLogModal={() => {
              setEditingExpense(null);
              setIsLogModalOpen(true);
            }}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsLogModalOpen(true);
            }}
            onDeleteExpense={handleDeleteExpense}
            onRetrySync={handleRetrySync}
            onSyncNow={handleTriggerFullSync}
            isSyncing={isFullSyncing}
            onUpdateReportStatus={handleUpdateExpenseReportStatus}
            onNavigateToReports={() => setActiveTab('reports')}
            onRequestRecall={handleRequestExpenseRecall}
            onApproveRecall={handleApproveExpenseRecall}
            onRejectRecall={handleRejectExpenseRecall}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            employees={employees}
            projects={projects}
            currentUser={currentUser}
            onUpdateReportStatus={handleUpdateExpenseReportStatus}
            onRequestRecall={handleRequestExpenseRecall}
            onApproveRecall={handleApproveExpenseRecall}
            onRejectRecall={handleRejectExpenseRecall}
            onRefreshData={loadAllData}
          />
        )}

        {isAdmin && activeTab === 'employees' && (
          <EmployeesView
            employees={employees}
            onOpenEmployeeModal={(emp) => {
              setEditingEmployee(emp);
              setIsEmployeeModalOpen(true);
            }}
            onDeleteEmployee={handleDeleteEmployee}
            onCreateZohoAccount={handleCreateZohoAccountForEmployee}
          />
        )}

        {isAdmin && activeTab === 'settings' && (
          <ZohoSettingsView
            zohoStatus={zohoStatus}
            onRefreshZohoStatus={loadAllData}
            onSyncNow={handleTriggerFullSync}
            isSyncing={isFullSyncing}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenLogModal={() => {
          setEditingExpense(null);
          setIsLogModalOpen(true);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSyncNow={handleTriggerFullSync}
        isSyncing={isFullSyncing}
      />

      {/* Log / Edit Expense Modal (Locked to the logged-in employee) */}
      <LogExpenseModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setEditingExpense(null);
        }}
        currentEmployee={currentEmployee || currentUser}
        categories={categories}
        projects={projects}
        onExpenseSaved={handleSaveExpense}
        editExpense={editingExpense}
      />

      {/* Employee Management Modal (Admin only) */}
      {isAdmin && (
        <EmployeeModal
          isOpen={isEmployeeModalOpen}
          onClose={() => {
            setIsEmployeeModalOpen(false);
            setEditingEmployee(null);
          }}
          employee={editingEmployee}
          projects={projects}
          zohoAccounts={zohoAccounts}
          onSaveEmployee={handleSaveEmployee}
        />
      )}

      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 animate-slide-up">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center space-x-2 ${
              toastMessage.type === 'error'
                ? 'bg-red-900 text-white border-red-800'
                : toastMessage.type === 'warning'
                ? 'bg-amber-900 text-white border-amber-800'
                : 'bg-slate-900 text-white border-slate-800'
            }`}
          >
            <span>{toastMessage.msg}</span>
          </div>
        </div>
      )}
    </div>
  );
}
