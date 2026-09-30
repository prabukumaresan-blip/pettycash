const express = require('express');
const router = express.Router();
const { db } = require('../config/supabase');
const zohoBooksService = require('../services/zohoBooksService');
const syncService = require('../services/syncService');

// GET Zoho connection status & token health
router.get('/status', async (req, res) => {
  try {
    const config = await db.getZohoConfig();
    const accounts = await db.getZohoAccounts();
    const projects = await db.getZohoProjects();
    const contacts = await db.getZohoContacts();

    const isTokenExpired = config.token_expires_at
      ? new Date(config.token_expires_at).getTime() < Date.now()
      : true;

    res.json({
      success: true,
      config: {
        client_id: config.client_id ? '••••••••' + config.client_id.slice(-6) : '',
        raw_client_id: config.client_id || '',
        redirect_uri: config.redirect_uri || 'http://localhost:5000/api/zoho/callback',
        organization_id: config.organization_id || '',
        organization_name: config.organization_name || 'Zoho Books Demo Org',
        dc_region: config.dc_region || 'com',
        is_connected: Boolean(config.is_connected && config.refresh_token && !config.refresh_token.includes('demo_')),
        has_refresh_token: Boolean(config.refresh_token && !config.refresh_token.includes('demo_')),
        mock_mode: Boolean(config.mock_mode),
        token_expires_at: config.token_expires_at,
        is_token_expired: isTokenExpired,
        last_sync_at: config.last_sync_at,
        auto_sync_interval_mins: config.auto_sync_interval_mins || 15
      },
      counts: {
        accounts: accounts.length,
        projects: projects.length,
        contacts: contacts.length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET OAuth 2.0 Authorization URL
router.get('/auth-url', async (req, res) => {
  try {
    const url = await zohoBooksService.getAuthorizationUrl();
    res.json({ success: true, url });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET OAuth 2.0 Callback handler
router.get('/callback', async (req, res) => {
  const { code, error } = req.query;

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  if (error) {
    return res.redirect(`${frontendUrl}/?zoho_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.status(400).send('Authorization code missing');
  }

  try {
    await zohoBooksService.handleOAuthCallback(code);
    // Run an initial sync after connecting
    await syncService.runFullSync();
    res.redirect(`${frontendUrl}/?zoho_connected=true`);
  } catch (err) {
    res.redirect(`${frontendUrl}/?zoho_error=${encodeURIComponent(err.message)}`);
  }
});

// POST Update Zoho Books Settings (Client ID, Secret, Org ID, DC Region, Mock Mode)
router.post('/settings', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Admin permissions required to modify Zoho settings.' });
    }
    const {
      client_id,
      client_secret,
      redirect_uri,
      organization_id,
      organization_name,
      dc_region,
      mock_mode
    } = req.body;

    const updates = {};
    if (client_id !== undefined) updates.client_id = client_id;
    if (client_secret !== undefined && client_secret !== '••••••••') updates.client_secret = client_secret;
    if (redirect_uri !== undefined) updates.redirect_uri = redirect_uri;
    if (organization_id !== undefined) updates.organization_id = organization_id;
    if (organization_name !== undefined) updates.organization_name = organization_name;
    if (dc_region !== undefined) updates.dc_region = dc_region;
    if (mock_mode !== undefined) updates.mock_mode = Boolean(mock_mode);

    const saved = await db.updateZohoConfig(updates);
    res.json({ success: true, message: 'Zoho configuration updated', config: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Trigger manual full sync
router.post('/sync', async (req, res) => {
  try {
    const result = await syncService.runFullSync();
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Synced Chart of Accounts (categorized into expense accounts & petty cash accounts)
router.get('/chart-of-accounts', async (req, res) => {
  try {
    const accounts = await db.getZohoAccounts();
    const expenseAccounts = accounts.filter(a => a.account_type === 'expense');
    const cashAccounts = accounts.filter(a => a.account_type === 'cash' || a.account_type === 'bank' || a.account_type === 'other_current_asset');
    res.json({
      success: true,
      accounts,
      expense_accounts: expenseAccounts,
      cash_accounts: cashAccounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Synced Projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await db.getZohoProjects();
    res.json({ success: true, projects });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Synced Contacts (Customers & Vendors)
router.get('/contacts', async (req, res) => {
  try {
    const contacts = await db.getZohoContacts();
    res.json({ success: true, contacts });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Sync Logs
router.get('/sync-logs', async (req, res) => {
  try {
    const logs = await db.getSyncLogs();
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
