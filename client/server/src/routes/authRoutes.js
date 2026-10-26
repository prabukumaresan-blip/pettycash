const express = require('express');
const router = express.Router();
const { db } = require('../config/supabase');
const zohoBooksService = require('../services/zohoBooksService');
const syncService = require('../services/syncService');
const { requireAuth } = require('../middleware/authMiddleware');

function sanitizeEmployee(emp) {
  const { password, ...safe } = emp;
  return safe;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please enter your Employee Code or Email, and Password.'
      });
    }

    const employees = await db.getEmployees();
    const cleanId = identifier.trim().toLowerCase();

    const emp = employees.find(
      e =>
        (e.email && e.email.toLowerCase() === cleanId) ||
        (e.employee_code && e.employee_code.toLowerCase() === cleanId)
    );

    if (!emp) {
      return res.status(401).json({
        success: false,
        error: 'No employee account found with that email or employee code.'
      });
    }

    if (emp.is_active === false) {
      return res.status(403).json({
        success: false,
        error: 'This employee account is deactivated. Please contact your administrator.'
      });
    }

    // Default password if not configured
    const expectedPassword = emp.password || (emp.role === 'admin' ? 'admin123' : 'emp123');

    if (password !== expectedPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Please check your credentials and try again.'
      });
    }

    // Auto-normalize Shaibani account if unlinked or set to obsolete ID
    if (emp && (emp.email === 'shaibani@company.com' || emp.id === 'emp-shaibani')) {
      if (!emp.petty_cash_account_id || emp.petty_cash_account_id === '3095712000009241002') {
        emp.petty_cash_account_id = '3095712000008522002';
        emp.petty_cash_account_name = 'Ibrahim AL Shaibani';
        await db.saveEmployee(emp);
      }
    }

    // Sync latest balance from Zoho Books if account is linked
    if (emp.petty_cash_account_id) {
      try {
        const liveBal = await zohoBooksService.getPettyCashBalance(emp.petty_cash_account_id);
        if (typeof liveBal === 'number') {
          emp.current_balance = liveBal;
          await db.updateEmployeeBalance(emp.id, liveBal);
        }
      } catch (zErr) {
        console.warn('Could not refresh balance during login:', zErr.message);
      }
    }

    const token = `pc-token-${emp.id}`;

    // Kick off background Zoho sync (syncs pending expenses and refreshes COA)
    syncService.runFullSync().catch(err => {
      console.warn('Background sync on login error:', err.message);
    });

    res.json({
      success: true,
      token,
      employee: sanitizeEmployee(emp)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/auth/me - Validate current session and get updated profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    let emp = await db.getEmployeeById(req.user.id);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'User profile not found.' });
    }

    // Auto-normalize Shaibani account if needed
    if (emp && (emp.email === 'shaibani@company.com' || emp.id === 'emp-shaibani')) {
      if (!emp.petty_cash_account_id || emp.petty_cash_account_id === '3095712000009241002') {
        emp.petty_cash_account_id = '3095712000008522002';
        emp.petty_cash_account_name = 'Ibrahim AL Shaibani';
        await db.saveEmployee(emp);
      }
    }

    // Attempt balance refresh from Zoho
    if (emp.petty_cash_account_id) {
      try {
        const liveBal = await zohoBooksService.getPettyCashBalance(emp.petty_cash_account_id);
        if (typeof liveBal === 'number') {
          emp.current_balance = liveBal;
          await db.updateEmployeeBalance(emp.id, liveBal);
        }
      } catch (zErr) {
        // Soft fail
      }
    }

    res.json({
      success: true,
      employee: sanitizeEmployee(emp)
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

// GET /api/auth/demo-accounts - Deprecated/Removed
router.get('/demo-accounts', async (req, res) => {
  res.json({ success: true, accounts: [] });
});

module.exports = router;
