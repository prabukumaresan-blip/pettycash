import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import OfflineBanner from './components/OfflineBanner';
import LogExpenseModal from './components/LogExpenseModal';
import EmployeeModal from './components/EmployeeModal';
import ReceiptViewerModal from './components/ReceiptViewerModal';
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
  const [modalTargetEmployee, setModalTargetEmployee] = useState(null);
  const [editingExpense, setEditingExpense] = useState(null);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [activeReceipt, setActiveReceipt] = useState(null); // { url, fileName }

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

  // Load All Core Data scoped to logged-in user in parallel
  const loadAllData = useCallback(async (userOverride = null) => {
    const stored = api.getStoredUser();
    const user = userOverride || currentUser || stored;
    if (!user || !stored) return;

    try {
      const [empRes, expRes, zRes, coaRes, projRes] = await Promise.allSettled([
        api.getEmployees(),
        api.getExpenses(),
        user.role === 'admin' ? api.getZohoStatus() : Promise.resolve(null),
        api.getChartOfAccounts(),
        api.getZohoProjects()
      ]);

      if (!api.getStoredUser()) return; // Abort if user logged out while request was in-flight

      if (empRes.status === 'fulfilled' && empRes.value?.success && empRes.value.employees) {
        setEmployees(empRes.value.employees);
        const self = empRes.value.employees.find((e) => e.id === user.id || (e.email && e.email.toLowerCase() === user.email?.toLowerCase())) || user;
        setCurrentEmployee(self);
        try {
          const currentStored = api.getStoredUser();
          if (currentStored && currentStored.id === self.id) {
            localStorage.setItem('petty_cash_user', JSON.stringify({ ...currentStored, ...self }));
          }
        } catch { }
      }

      if (expRes.status === 'fulfilled' && expRes.value?.success && Array.isArray(expRes.value.expenses)) {
        setExpenses((prevExpenses) => {
          const deletedSet = api.getDeletedIds ? api.getDeletedIds() : new Set();
          const exportedSet = api.getExportedIds ? api.getExportedIds() : new Set();
          const serverExpenses = expRes.value.expenses
            .filter(
              (e) => !deletedSet.has(String(e.id)) && (!e.zoho_journal_id || !deletedSet.has(String(e.zoho_journal_id)))
            )
            .map((e) => {
              if (exportedSet.has(String(e.id)) || (e.zoho_journal_id && exportedSet.has(String(e.zoho_journal_id)))) {
                return {
                  ...e,
                  is_exported: true,
                  exported_at: e.exported_at || new Date().toISOString(),
                  added_to_report: true
                };
              }
              return e;
            });
          const serverIds = new Set(serverExpenses.map((e) => e.id));
          const serverZohoIds = new Set(
            serverExpenses.filter((e) => e.zoho_journal_id).map((e) => String(e.zoho_journal_id))
          );
          // Retain ONLY newly recorded local offline expenses that have not yet reached server
          const localOnly = prevExpenses.filter(
            (e) => e.sync_status === 'pending' && !e.zoho_journal_id &&
              !deletedSet.has(String(e.id)) &&
              !serverIds.has(e.id)
          );
          return [...localOnly, ...serverExpenses];
        });
      }

      if (zRes.status === 'fulfilled' && zRes.value?.success) {
        setZohoStatus(zRes.value);
      }

      if (coaRes.status === 'fulfilled' && coaRes.value?.success) {
        if (coaRes.value.accounts) setZohoAccounts(coaRes.value.accounts);
        if (coaRes.value.expense_accounts) setCategories(coaRes.value.expense_accounts);
      }

      if (projRes.status === 'fulfilled' && projRes.value?.success && projRes.value.projects) {
        setProjects(projRes.value.projects);
      }
    } catch (err) {
      console.warn('Data load warning:', err.message);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser && api.getStoredUser()) {
      loadAllData();
    }
  }, [currentUser, loadAllData]);

  // Real-time automatic data sync on window focus / re-entry (paused when user is actively logging an expense)
  useEffect(() => {
    if (!currentUser) return;
    let lastSyncTime = Date.now();

    const handleSyncOnFocus = () => {
      // Do not interrupt user if a modal (e.g. logging an expense) is currently open
      if (isLogModalOpen || isEmployeeModalOpen) return;
      const now = Date.now();
      // Throttle window focus sync to avoid refetching on every tab switch or file picker close
      if (now - lastSyncTime < 120000) return;
      if (document.visibilityState === 'visible' && api.getStoredUser()) {
        lastSyncTime = now;
        loadAllData();
      }
    };
    window.addEventListener('visibilitychange', handleSyncOnFocus);
    window.addEventListener('focus', handleSyncOnFocus);

    // Periodic interval refresh (every 3 minutes) when idle and no modal is open
    const interval = setInterval(() => {
      if (isLogModalOpen || isEmployeeModalOpen) return;
      if (document.visibilityState === 'visible' && api.getStoredUser()) {
        lastSyncTime = Date.now();
        loadAllData();
      }
    }, 180000);

    return () => {
      window.removeEventListener('visibilitychange', handleSyncOnFocus);
      window.removeEventListener('focus', handleSyncOnFocus);
      clearInterval(interval);
    };
  }, [currentUser, loadAllData, isLogModalOpen, isEmployeeModalOpen]);

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
    const userCacheKey = `cached_expenses_${user.id}`;
    try {
      const cached = localStorage.getItem(userCacheKey);
      if (cached) {
        setExpenses(JSON.parse(cached));
      } else {
        setExpenses([]);
      }
    } catch {
      setExpenses([]);
    }
    setEmployees([]);
    setZohoAccounts([]);
    setCategories([]);
    setProjects([]);
    setZohoStatus(null);
    setCurrentUser(user);
    setCurrentEmployee(user);
    setActiveTab('dashboard');
    showToast(`Welcome back, ${user.name}!`);

    // Fetch latest user data concurrently
    loadAllData(user);

    // Auto-trigger background Zoho sync after login to fetch live balances & accounts
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
    } catch { }

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
    api.logout().catch(() => { });
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
      if (res && res.success) {
        showToast('Expense updated & synced with Zoho Books!');
        if (res.expense) {
          setExpenses((prev) => prev.map((e) => (e.id === expenseId ? res.expense : e)));
        }
      } else {
        throw new Error(res?.error || 'Failed to update expense voucher');
      }
    } else {
      const res = await api.saveExpense(formData);
      if (res && res.offline) {
        showToast('Saved offline. Will sync with Zoho when connected.', 'warning');
        setOfflineQueue(api.getOfflineQueue());
      } else if (res && res.success) {
        const vNum = res.expense?.zoho_journal_number || res.expense?.zoho_journal_id;
        showToast(
          res.synced
            ? `Expense saved & synced to Zoho Books! (Voucher #${vNum || 'Posted'})`
            : 'Expense saved! Zoho Books sync in background...'
        );
        // Immediately add newly saved expense to the Recent Activity list!
        if (res.expense) {
          setExpenses((prev) => [res.expense, ...prev.filter((e) => e.id !== res.expense.id)]);
        }
        if (res.employee_balance !== undefined) {
          const targetEmpId = res.expense?.employee_id || currentEmployee?.id;
          setCurrentEmployee((prev) => (prev && prev.id === targetEmpId ? { ...prev, current_balance: res.employee_balance } : prev));
          setEmployees((prev) => prev.map((emp) => emp.id === targetEmpId ? { ...emp, current_balance: res.employee_balance } : emp));
        }
      } else {
        throw new Error(res?.error || 'Failed to record expense voucher');
      }
    }
    // Trigger fresh data load in background without blocking modal close
    loadAllData().catch(() => { });
  };

  // Handle Deleting Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense? This will reverse the expense entry in Zoho Books.')) {
      return;
    }
    // Optimistically remove from state immediately
    setExpenses((prev) => prev.filter((e) => String(e.id) !== String(id) && (!e.zoho_journal_id || String(e.zoho_journal_id) !== String(id))));
    try {
      const res = await api.deleteExpense(id);
      if (res.success) {
        showToast('Expense deleted and cash balance restored', 'success');
        const targetId = res.deleted_id || id;
        const targetZohoId = res.zoho_journal_id;
        setExpenses((prev) => prev.filter((e) => String(e.id) !== String(targetId) && (!targetZohoId || String(e.zoho_journal_id) !== String(targetZohoId))));
        if (res.employee_balance !== undefined && res.employee_balance !== null) {
          setCurrentEmployee((prev) => prev ? { ...prev, current_balance: res.employee_balance } : prev);
          setEmployees((prev) => prev.map((emp) => emp.id === currentEmployee?.id ? { ...emp, current_balance: res.employee_balance } : emp));
        }
        await loadAllData();
      } else {
        showToast(res.error || 'Failed to delete expense', 'error');
        await loadAllData();
      }
    } catch (err) {
      showToast('Delete error: ' + err.message, 'error');
      await loadAllData();
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
        if (api.removeExportedId) api.removeExportedId(id);
        setExpenses((prev) =>
          prev.map((e) =>
            String(e.id) === String(id) || (e.zoho_journal_id && String(e.zoho_journal_id) === String(id))
              ? { ...e, is_exported: false, added_to_report: false, recall_status: null }
              : e
          )
        );
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
      if (res && res.success) {
        const vNum = res.expense?.zoho_journal_number || res.zoho_journal_number;
        showToast(`Synced to Zoho Books! Voucher #${vNum || 'Posted'}`);
        await loadAllData();
      } else {
        showToast(res?.error || 'Sync retry failed', 'error');
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
        const idSet = new Set(expenseIds.map(String));
        setExpenses((prev) =>
          prev.map((e) =>
            idSet.has(String(e.id)) || (e.zoho_journal_id && idSet.has(String(e.zoho_journal_id)))
              ? {
                ...e,
                added_to_report: addedToReport,
                added_to_report_at: addedToReport ? new Date().toISOString() : null
              }
              : e
          )
        );

        // Update local storage caches immediately so background or cached reads preserve added_to_report
        try {
          const keys = Object.keys(localStorage).filter((k) => k.startsWith('cached_expenses'));
          keys.forEach((k) => {
            const list = JSON.parse(localStorage.getItem(k) || '[]');
            const updated = list.map((e) =>
              idSet.has(String(e.id)) || (e.zoho_journal_id && idSet.has(String(e.zoho_journal_id)))
                ? {
                    ...e,
                    added_to_report: addedToReport,
                    added_to_report_at: addedToReport ? new Date().toISOString() : null
                  }
                : e
            );
            localStorage.setItem(k, JSON.stringify(updated));
          });
        } catch { }

        showToast(
          addedToReport
            ? `Marked ${expenseIds.length} expense(s) for export`
            : `Removed ${expenseIds.length} expense(s) from export list`,
          'success'
        );
        // Refresh app state in background
        loadAllData();
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

  // Handle Explicitly Marking Expenses as Exported (Condition 2)
  const handleMarkExpensesExported = async (expenseIds) => {
    if (!Array.isArray(expenseIds) || expenseIds.length === 0) return true;
    try {
      const idSet = new Set(expenseIds.map(String));
      const now = new Date().toISOString();

      if (api.addExportedIds) {
        api.addExportedIds(expenseIds);
      }

      setExpenses((prev) =>
        prev.map((e) =>
          idSet.has(String(e.id)) || (e.zoho_journal_id && idSet.has(String(e.zoho_journal_id)))
            ? {
                ...e,
                is_exported: true,
                exported_at: now,
                added_to_report: true,
                added_to_report_at: e.added_to_report_at || now
              }
            : e
        )
      );

      // Clean/update localStorage caches immediately
      try {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('cached_expenses'));
        keys.forEach((k) => {
          const list = JSON.parse(localStorage.getItem(k) || '[]');
          const updated = list.map((e) =>
            idSet.has(String(e.id)) || (e.zoho_journal_id && idSet.has(String(e.zoho_journal_id)))
              ? {
                  ...e,
                  is_exported: true,
                  exported_at: now,
                  added_to_report: true,
                  added_to_report_at: e.added_to_report_at || now
                }
              : e
          );
          localStorage.setItem(k, JSON.stringify(updated));
        });
      } catch { }

      const res = await api.markExpensesAsExported(expenseIds);
      if (res && res.success) {
        showToast(`Successfully marked ${expenseIds.length} expense log(s) as Exported.`);
      }
      await loadAllData();
      return true;
    } catch (err) {
      showToast('Export error: ' + err.message, 'error');
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
        <div className="w-20 h-20 rounded-3xl bg-white/95 p-3 flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6">
          <img src="/logo-192.png" alt="Bright Flowers" className="w-full h-full object-contain animate-pulse" />
        </div>
        <div className="w-8 h-8 border-3 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-3"></div>
        <div className="text-sm font-semibold text-slate-300">Loading Bright Flowers Petty Cash...</div>
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
        onSyncNow={handleTriggerFullSync}
        isSyncing={isFullSyncing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && (
          <DashboardView
            currentEmployee={currentEmployee || currentUser}
            currentUser={currentUser}
            employees={employees}
            expenses={expenses}
            onOpenLogModal={(targetEmp = null) => {
              setModalTargetEmployee(targetEmp);
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
            onViewReceipt={(url, fileName) => setActiveReceipt({ url, fileName })}
            onMarkSelectedExported={handleMarkExpensesExported}
            onRefreshData={loadAllData}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsView
            expenses={expenses}
            employees={employees}
            projects={projects}
            currentUser={currentUser}
            onUpdateReportStatus={handleUpdateExpenseReportStatus}
            onMarkSelectedExported={handleMarkExpensesExported}
            onDeleteExpense={handleDeleteExpense}
            onRequestRecall={handleRequestExpenseRecall}
            onApproveRecall={handleApproveExpenseRecall}
            onRejectRecall={handleRejectExpenseRecall}
            onRefreshData={loadAllData}
            onViewReceipt={(url, fileName) => setActiveReceipt({ url, fileName })}
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
            onRefresh={loadAllData}
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
        onOpenLogModal={(targetEmp = null) => {
          setModalTargetEmployee(targetEmp);
          setEditingExpense(null);
          setIsLogModalOpen(true);
        }}
        currentUser={currentUser}
        onLogout={handleLogout}
        onSyncNow={handleTriggerFullSync}
        isSyncing={isFullSyncing}
      />

      {/* Log / Edit Expense Modal (With admin employee selection & balance lock) */}
      <LogExpenseModal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setModalTargetEmployee(null);
          setEditingExpense(null);
        }}
        currentEmployee={modalTargetEmployee || currentEmployee || currentUser}
        currentUser={currentUser}
        employees={employees}
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

      {/* Receipt Attachment Viewer Modal */}
      {activeReceipt && (
        <ReceiptViewerModal
          receiptUrl={activeReceipt.url}
          fileName={activeReceipt.fileName}
          onClose={() => setActiveReceipt(null)}
        />
      )}

      {/* Toast Notification Alert (Clean Corporate Design) */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 animate-slide-up">
          <div
            className={`px-4 py-2.5 rounded-lg shadow-lg border text-xs font-semibold flex items-center space-x-2 ${toastMessage.type === 'error'
              ? 'bg-rose-900 text-white border-rose-800'
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
