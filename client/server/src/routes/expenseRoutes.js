const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db, supabase, isLiveSupabase } = require('../config/supabase');
const zohoBooksService = require('../services/zohoBooksService');

// Setup local uploads storage directory as reliable fallback
const UPLOAD_DIR = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../../uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch (e) {
    console.warn('Could not create upload directory:', e.message);
  }
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Helper: Upload file buffer to Supabase Storage or local disk
async function uploadReceiptFile(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const fileName = `receipt_${Date.now()}_${uuidv4().substring(0, 6)}${ext}`;

  if (isLiveSupabase && supabase) {
    try {
      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = supabase.storage
          .from('receipts')
          .getPublicUrl(fileName);
        return {
          url: publicUrlData.publicUrl,
          fileName
        };
      }
    } catch (sErr) {
      console.warn('⚠️ Supabase storage upload fallback to local:', sErr.message);
    }
  }

  // Local storage fallback
  const localPath = path.join(UPLOAD_DIR, fileName);
  fs.writeFileSync(localPath, file.buffer);
  return {
    url: `/uploads/${fileName}`,
    fileName
  };
}

// GET all expenses with optional filters
router.get('/', async (req, res) => {
  try {
    let effectiveEmployeeId = req.query.employee_id;
    if (req.user && req.user.role === 'employee') {
      effectiveEmployeeId = req.user.id;
    }

    const filters = {
      employee_id: effectiveEmployeeId,
      project_id: req.query.project_id,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      search: req.query.search
    };
    const expenses = await db.getExpenses(filters);
    res.json({ success: true, expenses });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single expense
router.get('/:id', async (req, res) => {
  try {
    const expense = await db.getExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    if (req.user && req.user.role === 'employee' && expense.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only view your own expenses' });
    }
    res.json({ success: true, expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Upload receipt attachment directly
router.post('/upload-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded' });
    }
    const uploaded = await uploadReceiptFile(req.file);
    res.json({ success: true, ...uploaded });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Create new expense and auto-sync to Zoho Books Journal Entry
router.post('/', upload.single('receipt'), async (req, res) => {
  try {
    const {
      expense_date = new Date().toISOString().split('T')[0],
      amount,
      category_id,
      category_name,
      description,
      project_id,
      project_name,
      customer_id,
      customer_name
    } = req.body;

    let employee_id = req.body.employee_id;
    if (req.user && req.user.role === 'employee') {
      employee_id = req.user.id;
    }

    if (!employee_id || !amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'Employee, amount, and description are required'
      });
    }

    const employee = await db.getEmployeeById(employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    let receiptUrl = req.body.receipt_url || null;
    let receiptFileName = req.body.receipt_file_name || null;

    if (req.file) {
      const uploadRes = await uploadReceiptFile(req.file);
      receiptUrl = uploadRes.url;
      receiptFileName = uploadRes.fileName;
    }

    const newExpense = {
      id: 'exp-' + uuidv4().substring(0, 8),
      employee_id,
      employee_name: employee.name,
      expense_date,
      amount: parseFloat(amount),
      category_id: category_id || '3095712000000000460',
      category_name: category_name || 'Other Expenses',
      paid_through_account_id: employee.petty_cash_account_id || null,
      paid_through_account_name: employee.petty_cash_account_name || `Petty Cash - ${employee.name}`,
      description,
      project_id: project_id || null,
      project_name: project_name || null,
      customer_id: customer_id || null,
      customer_name: customer_name || null,
      cost_center: null,
      receipt_url: receiptUrl,
      receipt_file_name: receiptFileName,
      zoho_journal_id: null,
      zoho_journal_number: null,
      sync_status: 'pending',
      sync_error: null,
      last_synced_at: null,
      created_by: employee.name
    };

    // Attempt immediate Zoho Books Expense creation
    try {
      const journalRes = await zohoBooksService.createExpenseJournal(newExpense, employee);
      newExpense.zoho_journal_id = journalRes.zoho_journal_id;
      newExpense.zoho_journal_number = journalRes.zoho_journal_number;
      newExpense.sync_status = 'synced';
      newExpense.last_synced_at = new Date().toISOString();
      newExpense.sync_error = null;

      // Immediately synchronize live closing balance from Zoho Books
      if (employee.petty_cash_account_id) {
        try {
          const liveBal = await zohoBooksService.getPettyCashBalance(employee.petty_cash_account_id);
          if (typeof liveBal === 'number') {
            await db.updateEmployeeBalance(employee_id, liveBal);
          } else {
            await db.updateEmployeeBalance(employee_id, (parseFloat(employee.current_balance || 0) - parseFloat(amount)));
          }
        } catch {
          await db.updateEmployeeBalance(employee_id, (parseFloat(employee.current_balance || 0) - parseFloat(amount)));
        }
      }
    } catch (zErr) {
      console.warn('⚠️ Zoho Expense creation deferred to background sync:', zErr.message);
      newExpense.sync_status = 'pending';
      newExpense.sync_error = zErr.message;
    }

    const savedExpense = await db.saveExpense(newExpense);
    const updatedEmployee = await db.getEmployeeById(employee_id);

    res.status(201).json({
      success: true,
      expense: savedExpense,
      employee_balance: updatedEmployee.current_balance,
      synced: savedExpense.sync_status === 'synced'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT Update expense
router.put('/:id', upload.single('receipt'), async (req, res) => {
  try {
    const existing = await db.getExpenseById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    if (req.user && req.user.role === 'employee' && existing.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only modify your own expenses' });
    }

    const employee = await db.getEmployeeById(existing.employee_id);
    const updates = { ...existing, ...req.body };

    if (req.file) {
      const uploadRes = await uploadReceiptFile(req.file);
      updates.receipt_url = uploadRes.url;
      updates.receipt_file_name = uploadRes.fileName;
    }

    if (updates.amount) {
      updates.amount = parseFloat(updates.amount);
    }

    // Update in Zoho Books if previously synced or retry
    if (employee && employee.petty_cash_account_id) {
      try {
        const jRes = await zohoBooksService.updateExpenseJournal(updates, employee);
        updates.zoho_journal_id = jRes.zoho_journal_id;
        updates.zoho_journal_number = jRes.zoho_journal_number;
        updates.sync_status = 'synced';
        updates.sync_error = null;
        updates.last_synced_at = new Date().toISOString();

        // Update live balance
        try {
          const liveBal = await zohoBooksService.getPettyCashBalance(employee.petty_cash_account_id);
          if (typeof liveBal === 'number') {
            await db.updateEmployeeBalance(existing.employee_id, liveBal);
          }
        } catch {}
      } catch (zErr) {
        updates.sync_status = 'failed';
        updates.sync_error = zErr.message;
      }
    }

    const saved = await db.saveExpense(updates);
    const updatedEmployee = await db.getEmployeeById(existing.employee_id);

    res.json({
      success: true,
      expense: saved,
      employee_balance: updatedEmployee.current_balance
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE Expense (and remove Zoho journal entry)
router.delete('/:id', async (req, res) => {
  try {
    const expense = await db.getExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    if (req.user && req.user.role === 'employee' && expense.employee_id !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied: You can only delete your own expenses' });
    }

    const employee = await db.getEmployeeById(expense.employee_id);

    // If synced with Zoho Books, delete the Expense in Zoho
    if (expense.zoho_journal_id) {
      try {
        await zohoBooksService.deleteExpenseJournal(expense.zoho_journal_id);
      } catch (zErr) {
        console.warn('⚠️ Could not delete expense in Zoho:', zErr.message);
      }
    }

    await db.deleteExpense(req.params.id);

    if (employee && employee.petty_cash_account_id) {
      try {
        const liveBal = await zohoBooksService.getPettyCashBalance(employee.petty_cash_account_id);
        if (typeof liveBal === 'number') {
          await db.updateEmployeeBalance(employee.id, liveBal);
        }
      } catch {}
    }

    const updatedEmployee = await db.getEmployeeById(expense.employee_id);

    res.json({
      success: true,
      message: 'Expense deleted and employee balance restored',
      employee_balance: updatedEmployee ? updatedEmployee.current_balance : null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Retry Zoho sync for an expense
router.post('/:id/retry-sync', async (req, res) => {
  try {
    const expense = await db.getExpenseById(req.params.id);
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const employee = await db.getEmployeeById(expense.employee_id);
    if (!employee) {
      return res.status(404).json({ success: false, error: 'Employee not found' });
    }

    const journalRes = await zohoBooksService.createExpenseJournal(expense, employee);
    expense.zoho_journal_id = journalRes.zoho_journal_id;
    expense.zoho_journal_number = journalRes.zoho_journal_number;
    expense.sync_status = 'synced';
    expense.sync_error = null;
    expense.last_synced_at = new Date().toISOString();

    if (employee.petty_cash_account_id) {
      try {
        const liveBal = await zohoBooksService.getPettyCashBalance(employee.petty_cash_account_id);
        if (typeof liveBal === 'number') {
          await db.updateEmployeeBalance(employee.id, liveBal);
        }
      } catch {}
    }

    const saved = await db.saveExpense(expense);
    res.json({ success: true, expense: saved, message: 'Expense synced with Zoho Books' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
