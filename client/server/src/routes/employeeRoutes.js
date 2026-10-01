const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../config/supabase');
const zohoBooksService = require('../services/zohoBooksService');

// GET all employees
router.get('/', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee') {
      const emp = await db.getEmployeeById(req.user.id);
      if (emp && emp.petty_cash_account_id) {
        try {
          const liveBal = await zohoBooksService.getPettyCashBalance(emp.petty_cash_account_id);
          if (typeof liveBal === 'number') {
            emp.current_balance = liveBal;
            await db.updateEmployeeBalance(emp.id, liveBal);
          }
        } catch (zErr) {}
      }
      const { password, ...safe } = emp || req.user;
      return res.json({ success: true, employees: [safe] });
    }

    const employees = await db.getEmployees();
    // Live sync Zoho closing balances for all employees with linked accounts
    for (const emp of employees) {
      if (emp.petty_cash_account_id) {
        try {
          const liveBal = await zohoBooksService.getPettyCashBalance(emp.petty_cash_account_id);
          if (typeof liveBal === 'number') {
            emp.current_balance = liveBal;
            await db.updateEmployeeBalance(emp.id, liveBal);
          }
        } catch (zErr) {}
      }
    }
    const safeEmployees = employees.map(e => {
      const { password, ...safe } = e;
      return safe;
    });
    res.json({ success: true, employees: safeEmployees });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single employee by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own details.' });
    }
    const employee = await db.getEmployeeById(req.params.id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }
    if (employee.petty_cash_account_id) {
      try {
        const liveBal = await zohoBooksService.getPettyCashBalance(employee.petty_cash_account_id);
        if (typeof liveBal === 'number') {
          employee.current_balance = liveBal;
          await db.updateEmployeeBalance(employee.id, liveBal);
        }
      } catch (zErr) {}
    }
    const { password, ...safe } = employee;
    res.json({ success: true, employee: safe });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create employee (Admin only)
router.post('/', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin permissions required.' });
    }

    const {
      name,
      email,
      employee_code,
      password,
      role = 'employee',
      initial_float = 1000,
      department = 'General',
      default_project_id = null,
      petty_cash_account_id = null,
      auto_create_zoho_account = false
    } = req.body;

    if (!name || !email || !employee_code) {
      return res.status(400).json({ success: false, error: 'Name, email, and employee code are required' });
    }

    const newEmp = {
      id: 'emp-' + uuidv4().substring(0, 8),
      name,
      email,
      employee_code,
      password: password || (role === 'admin' ? 'admin123' : 'emp123'),
      role,
      initial_float: parseFloat(initial_float) || 1000,
      current_balance: parseFloat(initial_float) || 1000,
      department,
      default_project_id,
      default_project_name: null,
      petty_cash_account_id,
      petty_cash_account_name: null,
      is_active: true
    };

    if (default_project_id) {
      const allProjects = await db.getZohoProjects();
      const matched = allProjects.find(p => p.project_id === default_project_id);
      newEmp.default_project_name = matched ? matched.project_name : null;
    }

    // Auto-create petty cash account in Zoho Books if requested
    if (auto_create_zoho_account || !petty_cash_account_id) {
      try {
        const zohoAcc = await zohoBooksService.createEmployeePettyCashAccount(newEmp);
        newEmp.petty_cash_account_id = zohoAcc.account_id;
        newEmp.petty_cash_account_name = zohoAcc.account_name || `Petty Cash - ${name}`;
      } catch (zErr) {
        console.warn('⚠️ Zoho account creation fallback:', zErr.message);
        newEmp.petty_cash_account_id = 'acc-pc-' + Math.floor(100 + Math.random() * 900);
        newEmp.petty_cash_account_name = `Petty Cash - ${name}`;
      }
    } else if (petty_cash_account_id) {
      const allAccounts = await db.getZohoAccounts();
      const matchedAcc = allAccounts.find(a => a.account_id === petty_cash_account_id);
      if (matchedAcc) {
        newEmp.petty_cash_account_name = matchedAcc.account_name;
        try {
          const zRes = await zohoBooksService.makeApiRequest(`/chartofaccounts/${matchedAcc.account_id}`);
          if (zRes && zRes.chart_of_account && zRes.chart_of_account.closing_balance !== undefined) {
            newEmp.initial_float = zRes.chart_of_account.closing_balance;
          } else {
            newEmp.initial_float = matchedAcc.current_balance || 0;
          }
        } catch (e) {
          newEmp.initial_float = matchedAcc.current_balance || 0;
        }
      }
    }

    const saved = await db.saveEmployee(newEmp);
    res.status(201).json({ success: true, employee: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update employee
router.put('/:id', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee' && req.user.id !== req.params.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only update your own details.' });
    }
    const existing = await db.getEmployeeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    if (req.body.default_project_id) {
      const allProjects = await db.getZohoProjects();
      const matched = allProjects.find(p => p.project_id === req.body.default_project_id);
      req.body.default_project_name = matched ? matched.project_name : null;
    }

    if (req.body.petty_cash_account_id) {
      const allAccounts = await db.getZohoAccounts();
      const matchedAcc = allAccounts.find(a => a.account_id === req.body.petty_cash_account_id);
      if (matchedAcc) {
        req.body.petty_cash_account_name = matchedAcc.account_name;
        try {
          const zRes = await zohoBooksService.makeApiRequest(`/chartofaccounts/${matchedAcc.account_id}`);
          if (zRes && zRes.chart_of_account && zRes.chart_of_account.closing_balance !== undefined) {
            req.body.initial_float = zRes.chart_of_account.closing_balance;
          } else {
            req.body.initial_float = matchedAcc.current_balance || 0;
          }
        } catch (e) {
          req.body.initial_float = matchedAcc.current_balance || 0;
        }
      }
    }

    const updated = await db.saveEmployee({
      ...existing,
      ...req.body,
      id: req.params.id
    });

    res.json({ success: true, employee: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE / Deactivate employee (Admin only)
router.delete('/:id', async (req, res) => {
  try {
    if (req.user && req.user.role === 'employee') {
      return res.status(403).json({ success: false, error: 'Access denied: Admin permissions required.' });
    }
    const { hardDelete } = req.query;
    if (hardDelete === 'true') {
      await db.deleteEmployee(req.params.id);
      return res.json({ success: true, message: 'Employee permanently deleted' });
    }

    // Soft delete / deactivate
    const existing = await db.getEmployeeById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    existing.is_active = false;
    await db.saveEmployee(existing);
    res.json({ success: true, message: 'Employee deactivated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Replenish / Top-up employee petty cash float
router.post('/:id/topup', async (req, res) => {
  try {
    const { amount, notes, payment_mode = 'Bank Transfer' } = req.body;
    const emp = await db.getEmployeeById(req.params.id);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const topupAmt = parseFloat(amount);
    if (isNaN(topupAmt) || topupAmt <= 0) {
      return res.status(400).json({ success: false, error: 'Valid top-up amount is required' });
    }

    // Increase current balance
    emp.current_balance = (parseFloat(emp.current_balance || 0) + topupAmt);
    await db.saveEmployee(emp);

    await db.addSyncLog('topup', 'success', {
      employee_id: emp.id,
      amount: topupAmt,
      payment_mode,
      notes
    });

    res.json({ success: true, employee: emp, message: `Topped up OMR ${topupAmt.toFixed(3)} successfully` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create dedicated Zoho Books Petty Cash account for employee
router.post('/:id/create-zoho-account', async (req, res) => {
  try {
    const emp = await db.getEmployeeById(req.params.id);
    if (!emp) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const zohoAcc = await zohoBooksService.createEmployeePettyCashAccount(emp);
    emp.petty_cash_account_id = zohoAcc.account_id;
    emp.petty_cash_account_name = zohoAcc.account_name || `Petty Cash - ${emp.name}`;
    await db.saveEmployee(emp);

    res.json({ success: true, employee: emp, zoho_account: zohoAcc });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
