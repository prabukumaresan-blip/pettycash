const express = require('express');
const router = express.Router();
const { db } = require('../config/supabase');
const syncService = require('../services/syncService');

// POST Webhook from Zoho Books
router.post('/zoho', async (req, res) => {
  try {
    const payload = req.body;
    const eventType = req.headers['x-zoho-event'] || payload.event_type || 'zoho_event';

    console.log(`📡 [Webhook] Received Zoho Books webhook event: ${eventType}`, payload);

    await db.addSyncLog('webhook_received', 'info', {
      event_type: eventType,
      payload
    });

    // Handle project creation/update
    if (eventType.includes('project')) {
      syncService.syncProjects().catch(err => console.error('Project sync error:', err.message));
    }
    // Handle chart of accounts update
    else if (eventType.includes('chartofaccounts') || eventType.includes('account')) {
      syncService.syncChartOfAccounts().catch(err => console.error('COA sync error:', err.message));
    }

    res.json({ success: true, message: 'Webhook received and processed' });
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
