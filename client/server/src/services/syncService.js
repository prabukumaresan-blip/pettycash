const cron = require('node-cron');
const { db } = require('../config/supabase');
const zohoBooksService = require('./zohoBooksService');

class SyncService {
  constructor() {
    this.cronJob = null;
    this.isSyncing = false;
  }

  // Initialize node-cron schedule based on config interval
  init() {
    // Run every 15 minutes by default
    this.cronJob = cron.schedule('*/15 * * * *', async () => {
      console.log('⏰ [Cron] Running scheduled Zoho Books sync cycle...');
      await this.runFullSync();
    });

    console.log('🚀 Scheduled background sync initialized (runs every 15 minutes)');
  }

  // Sync all pending expenses to Zoho Books journals
  async syncPendingExpenses() {
    const expenses = await db.getExpenses();
    const pending = expenses.filter(e => e.sync_status === 'pending' || e.sync_status === 'failed');

    if (pending.length === 0) {
      return { total: 0, synced: 0, failed: 0 };
    }

    console.log(`🔄 Found ${pending.length} pending/failed expenses to sync to Zoho Books...`);
    let synced = 0;
    let failed = 0;

    for (const exp of pending) {
      try {
        const employee = await db.getEmployeeById(exp.employee_id);
        if (!employee) {
          throw new Error(`Employee ID ${exp.employee_id} not found`);
        }

        const journalRes = await zohoBooksService.createExpenseJournal(exp, employee);
        await db.saveExpense({
          ...exp,
          zoho_journal_id: journalRes.zoho_journal_id,
          zoho_journal_number: journalRes.zoho_journal_number,
          sync_status: 'synced',
          sync_error: null,
          last_synced_at: new Date().toISOString()
        });
        synced++;
      } catch (err) {
        failed++;
        console.error(`❌ Sync failed for expense ${exp.id}:`, err.message);
        await db.saveExpense({
          ...exp,
          sync_status: 'failed',
          sync_error: err.message,
          last_synced_at: new Date().toISOString()
        });
      }
    }

    return { total: pending.length, synced, failed };
  }

  // Run full sync: Chart of Accounts, Projects, Contacts & Pending Expenses
  async runFullSync() {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress, skipping run...');
      return { in_progress: true };
    }

    this.isSyncing = true;
    const summary = {
      started_at: new Date().toISOString(),
      coa_synced: false,
      projects_synced: false,
      contacts_synced: false,
      pending_expenses: null,
      errors: []
    };

    try {
      // 1. Sync Chart of Accounts
      try {
        const accounts = await zohoBooksService.syncChartOfAccounts();
        summary.coa_synced = accounts.length;
      } catch (err) {
        summary.errors.push(`COA: ${err.message}`);
      }

      // 2. Sync Projects
      try {
        const projects = await zohoBooksService.syncProjects();
        summary.projects_synced = projects.length;
      } catch (err) {
        summary.errors.push(`Projects: ${err.message}`);
      }

      // 3. Sync Contacts
      try {
        const contacts = await zohoBooksService.syncContacts();
        summary.contacts_synced = contacts.length;
      } catch (err) {
        summary.errors.push(`Contacts: ${err.message}`);
      }

      // 4. Push Pending Expenses
      summary.pending_expenses = await this.syncPendingExpenses();

      await db.updateZohoConfig({ last_sync_at: new Date().toISOString() });
      await db.addSyncLog('full_sync', summary.errors.length ? 'warning' : 'success', summary);
    } catch (err) {
      summary.errors.push(`General: ${err.message}`);
      await db.addSyncLog('full_sync', 'failure', summary, err.message);
    } finally {
      this.isSyncing = false;
      summary.completed_at = new Date().toISOString();
    }

    return summary;
  }
}

module.exports = new SyncService();
