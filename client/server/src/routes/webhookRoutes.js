const express = require('express');
const router = express.Router();
const { db } = require('../config/supabase');
const syncService = require('../services/syncService');

// POST Webhook from Zoho Books
router.post('/zoho', async (req, res) => {
  try {
    const payload = req.body || {};
    const eventType = (req.headers['x-zoho-event'] || payload.event_type || payload.event || 'zoho_event').toLowerCase();

    console.log(`📡 [Webhook] Received Zoho Books webhook event: ${eventType}`, payload);

    await db.addSyncLog('webhook_received', 'info', {
      event_type: eventType,
      payload
    });

    const isDelete = eventType.includes('delete') || 
      payload.operation === 'delete' || 
      payload.action === 'delete';

    // Immediate deletion handling for expenses deleted in Zoho Books
    if (isDelete && (eventType.includes('expense') || payload.expense_id || payload.expense)) {
      const targetZohoId = payload.expense_id || payload.expense?.expense_id || payload.entity_id || payload.id;
      if (targetZohoId) {
        console.log(`📡 [Webhook] Expense deletion event for Zoho ID: ${targetZohoId}. Deleting local record...`);
        await db.deleteExpense(targetZohoId);
      }
      syncService.runFullSync().catch(err => console.error('Webhook sync error:', err.message));
    }
    // Handle project creation/update
    else if (eventType.includes('project')) {
      syncService.syncProjects().catch(err => console.error('Project sync error:', err.message));
    }
    // Handle chart of accounts update
    else if (eventType.includes('chartofaccounts') || eventType.includes('account')) {
      syncService.syncChartOfAccounts().catch(err => console.error('COA sync error:', err.message));
    }
    // Handle expense or payment updates from Zoho Books
    else if (eventType.includes('expense') || eventType.includes('payment') || eventType.includes('journal')) {
      syncService.runFullSync().catch(err => console.error('Webhook sync error:', err.message));
    }

    res.json({ success: true, message: 'Webhook received and processed' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
