const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const { db } = require('../config/supabase');
const syncService = require('../services/syncService');

// Helper to filter expenses
async function getFilteredExpenses(query, user) {
  let effectiveUser = user;
  if (!effectiveUser && query.auth_user_id) {
    effectiveUser = await db.getEmployeeById(query.auth_user_id);
  }

  let effectiveEmployeeId = query.employee_id;
  if (effectiveUser && effectiveUser.role === 'employee') {
    effectiveEmployeeId = effectiveUser.id;
  }

  // 1. If explicit expense_ids are provided, prioritize resolving them immediately
  if (query.expense_ids) {
    const idList = Array.isArray(query.expense_ids)
      ? query.expense_ids.map(String)
      : String(query.expense_ids).split(',').map(s => s.trim());
    const idSet = new Set(idList);
    const allExpenses = await db.getExpenses({});
    const matched = allExpenses.filter(e =>
      idSet.has(String(e.id)) ||
      (e.zoho_journal_id && idSet.has(String(e.zoho_journal_id))) ||
      (e.invoice_number && idSet.has(String(e.invoice_number)))
    );
    if (matched.length > 0) return matched;
  }

  const {
    project_id,
    customer_id,
    start_date,
    end_date,
    sync_status,
    search,
    added_to_report,
    is_exported
  } = query;

  let expenses = await db.getExpenses({
    employee_id: effectiveEmployeeId,
    project_id,
    start_date,
    end_date,
    search,
    added_to_report,
    is_exported
  });

  if (customer_id) {
    expenses = expenses.filter(e => e.customer_id === customer_id);
  }
  if (sync_status) {
    expenses = expenses.filter(e => e.sync_status === sync_status);
  }
  if (added_to_report !== undefined && added_to_report !== '') {
    const isBool = added_to_report === 'true' || added_to_report === true;
    expenses = expenses.filter(e => Boolean(e.added_to_report) === isBool);
  }
  if (is_exported !== undefined && is_exported !== '') {
    const isBool = is_exported === 'true' || is_exported === true;
    expenses = expenses.filter(e => Boolean(e.is_exported) === isBool);
  }

  return expenses;
}

// GET Report data & summaries
router.get('/', async (req, res) => {
  try {
    if (req.query.resync === 'true') {
      await syncService.runFullSync();
    }

    const expenses = await getFilteredExpenses(req.query, req.user);

    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const syncedCount = expenses.filter(e => e.sync_status === 'synced').length;
    const pendingCount = expenses.filter(e => e.sync_status === 'pending').length;

    // Breakdown by project
    const projectBreakdown = {};
    expenses.forEach(e => {
      const pName = e.project_name || 'Unassigned Project';
      projectBreakdown[pName] = (projectBreakdown[pName] || 0) + parseFloat(e.amount || 0);
    });

    // Breakdown by category
    const categoryBreakdown = {};
    expenses.forEach(e => {
      const cName = e.category_name || 'General';
      categoryBreakdown[cName] = (categoryBreakdown[cName] || 0) + parseFloat(e.amount || 0);
    });

    res.json({
      success: true,
      meta: {
        total_records: expenses.length,
        total_amount: totalAmount,
        synced_count: syncedCount,
        pending_count: pendingCount,
        date_range: {
          start: req.query.start_date || null,
          end: req.query.end_date || null
        }
      },
      analytics: {
        project_breakdown: projectBreakdown,
        category_breakdown: categoryBreakdown
      },
      expenses
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// CSV Export Handler (GET and POST)
const handleCsvExport = async (req, res) => {
  try {
    if (req.query?.resync === 'true' || req.body?.resync === 'true') {
      await syncService.runFullSync();
    }

    const payload = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;

    let expenses = [];
    if (payload.expenses && Array.isArray(payload.expenses) && payload.expenses.length > 0) {
      expenses = payload.expenses;
    } else {
      expenses = await getFilteredExpenses(payload, req.user);
    }

    // Automatically mark expenses as exported when report is exported (unless explicitly mark_exported=false)
    const shouldMarkExported = payload.mark_exported === 'true' || payload.mark_exported === true || payload.mark_exported !== 'false';
    if (shouldMarkExported) {
      const now = new Date().toISOString();
      const exportDateStr = now.substring(0, 10).replace(/-/g, '');
      for (const exp of expenses) {
        if (!exp.is_exported) {
          const empCode = (exp.employee_code || exp.employee_name || 'EMP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'EMP';
          const voucherDateClean = (exp.expense_date || exportDateStr).replace(/-/g, '');
          const projTag = exp.project_name ? exp.project_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) : '';
          const distinctReportId = payload.report_id || (projTag ? `REP-${empCode}-${voucherDateClean}-${projTag}` : `REP-${empCode}-${voucherDateClean}`);
          exp.is_exported = true;
          exp.exported_at = exp.exported_at || now;
          exp.added_to_report = true;
          if (!exp.added_to_report_at) exp.added_to_report_at = now;
          if (!exp.report_id) exp.report_id = distinctReportId;
          try {
            await db.saveExpense(exp);
          } catch (e) {
            console.warn('Could not save exported state for expense:', exp.id, e.message);
          }
        }
      }
    }

    const fields = [
      { label: 'Date', value: 'expense_date' },
      { label: 'Employee', value: 'employee_name' },
      { label: 'Paid Through Account', value: row => row.paid_through_account_name || `Petty Cash - ${row.employee_name}` },
      { label: 'Expense Account', value: row => row.category_name || 'Petty Cash Purchases' },
      { label: 'Project', value: row => row.project_name || 'N/A' },
      { label: 'Invoice Number', value: row => row.invoice_number || 'N/A' },
      { label: 'Amount (OMR)', value: row => parseFloat(row.amount || 0).toFixed(3) },
      { label: 'Description', value: 'description' },
      { label: 'Zoho Books Journal ID', value: row => row.zoho_journal_id || 'Pending Sync' },
      { label: 'Zoho Journal Number', value: row => row.zoho_journal_number || 'N/A' },
      { label: 'Sync Status', value: 'sync_status' },
      { label: 'Added to Report', value: row => row.added_to_report ? 'Yes' : 'No' },
      { label: 'Exported as Report', value: row => row.is_exported ? 'Yes' : 'No' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(expenses);

    res.header('Content-Type', 'text/csv');
    res.attachment(`petty_cash_report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/export/csv', handleCsvExport);
router.post('/export/csv', handleCsvExport);

// PDF Export Handler (GET and POST)
const handlePdfExport = async (req, res) => {
  try {
    if (req.query?.resync === 'true' || req.body?.resync === 'true') {
      await syncService.runFullSync();
    }

    const payload = req.method === 'POST' ? { ...req.query, ...req.body } : req.query;

    let expenses = [];
    if (payload.expenses && Array.isArray(payload.expenses) && payload.expenses.length > 0) {
      expenses = payload.expenses;
    } else {
      expenses = await getFilteredExpenses(payload, req.user);
    }

    // Automatically mark expenses as exported when report is exported (unless explicitly mark_exported=false)
    const shouldMarkExported = payload.mark_exported === 'true' || payload.mark_exported === true || payload.mark_exported !== 'false';
    if (shouldMarkExported) {
      const now = new Date().toISOString();
      const exportDateStr = now.substring(0, 10).replace(/-/g, '');
      for (const exp of expenses) {
        if (!exp.is_exported) {
          const empCode = (exp.employee_code || exp.employee_name || 'EMP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'EMP';
          const voucherDateClean = (exp.expense_date || exportDateStr).replace(/-/g, '');
          const projTag = exp.project_name ? exp.project_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) : '';
          const distinctReportId = payload.report_id || (projTag ? `REP-${empCode}-${voucherDateClean}-${projTag}` : `REP-${empCode}-${voucherDateClean}`);
          exp.is_exported = true;
          exp.exported_at = exp.exported_at || now;
          exp.added_to_report = true;
          if (!exp.added_to_report_at) exp.added_to_report_at = now;
          if (!exp.report_id) exp.report_id = distinctReportId;
          try {
            await db.saveExpense(exp);
          } catch (e) {
            console.warn('Could not save exported state for expense:', exp.id, e.message);
          }
        }
      }
    }

    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.setHeader('Content-Disposition', `attachment; filename=petty_cash_report_${Date.now()}.pdf`);
      res.send(pdfBuffer);
    });
    doc.on('error', (err) => {
      console.error('PDF generation error:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Header Branding with Logo
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 40, 24, { fit: [55, 55] });
      } catch (err) {
        console.warn('Could not render logo in PDF:', err.message);
      }
    }

    const textX = fs.existsSync(logoPath) ? 105 : 40;
    doc.fillColor('#0f172a').fontSize(16).font('Helvetica-Bold').text('BRIGHT FLOWERS TRADING LLC', textX, 28);
    const claimName = expenses.length > 0 && expenses[0].employee_name ? expenses[0].employee_name : (req.user?.name || 'Employee');
    const isReprint = payload.is_reprint === 'true' || payload.is_reprint === true || payload.is_exported === 'true' || (expenses.length > 0 && expenses.every(e => e.is_exported));
    const subtitle = isReprint
      ? `Petty cash claim statement - ${claimName} (Official Archive Copy)`
      : `Petty cash claim - ${claimName}`;
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text(subtitle, textX, 50);

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    const exportedDate = expenses.length > 0 && expenses[0].exported_at ? new Date(expenses[0].exported_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;
    const headerDateText = isReprint && exportedDate ? `Exported: ${exportedDate} (Re-print)` : `Generated: ${dateStr}`;
    doc.fillColor('#475569').fontSize(9).text(headerDateText, doc.page.width - 220, 32, { align: 'right', width: 180 });
    doc.text(`Total Records: ${expenses.length}`, doc.page.width - 220, 48, { align: 'right', width: 180 });

    doc.moveDown(4);

    // Summary Statistics Cards
    const cardY = 115;
    doc.rect(40, cardY, 160, 50).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('TOTAL EXPENDITURE', 50, cardY + 10);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`OMR ${totalAmount.toFixed(3)}`, 50, cardY + 24);

    // Table Header
    let currentY = 185;
    const tableTop = currentY;
    const colX = {
      date: 40,
      invoice: 105,
      project: 185,
      notes: 295,
      amount: 470
    };

    doc.rect(40, tableTop, 515, 22).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('DATE', colX.date + 5, tableTop + 6);
    doc.text('INVOICE NO.', colX.invoice, tableTop + 6);
    doc.text('PROJECT', colX.project, tableTop + 6);
    doc.text('NOTES', colX.notes, tableTop + 6);
    doc.text('AMOUNT (OMR)', colX.amount, tableTop + 6, { width: 85, align: 'right' });

    currentY = tableTop + 24;

    // Table Rows
    doc.font('Helvetica').fontSize(8);
    for (let i = 0; i < expenses.length; i++) {
      const exp = expenses[i];

      // Page overflow check
      if (currentY > 740) {
        doc.addPage();
        currentY = 50;
        // Repeat mini header on new page
        doc.rect(40, currentY, 515, 20).fill('#f1f5f9');
        doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
        doc.text('DATE', colX.date + 5, currentY + 5);
        doc.text('INVOICE NO.', colX.invoice, currentY + 5);
        doc.text('PROJECT', colX.project, currentY + 5);
        doc.text('NOTES', colX.notes, currentY + 5);
        doc.text('AMOUNT (OMR)', colX.amount, currentY + 5, { width: 85, align: 'right' });
        currentY += 24;
        doc.font('Helvetica').fontSize(8);
      }

      // Zebra striping
      if (i % 2 === 1) {
        doc.rect(40, currentY - 2, 515, 20).fill('#f8fafc');
      }

      doc.fillColor('#334155').font('Helvetica');
      doc.text(exp.expense_date || '—', colX.date + 5, currentY + 2, { width: 55 });
      doc.text(exp.invoice_number || '—', colX.invoice, currentY + 2, { width: 75, ellipsis: true });
      doc.text(exp.project_name || 'N/A', colX.project, currentY + 2, { width: 105, ellipsis: true });
      doc.text(exp.description || '', colX.notes, currentY + 2, { width: 170, ellipsis: true });

      doc.fillColor('#0f172a').font('Helvetica-Bold');
      doc.text(`${parseFloat(exp.amount || 0).toFixed(3)}`, colX.amount, currentY + 2, { width: 85, align: 'right' });

      currentY += 22;
    }

    // Grand Total Bar
    if (currentY > 740) doc.addPage();
    doc.moveDown(1);
    doc.rect(40, currentY, 515, 25).fill('#e2e8f0');
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    doc.text('TOTAL EXPENSES', 50, currentY + 8);
    doc.text(`OMR ${totalAmount.toFixed(3)}`, colX.amount, currentY + 8, { width: 85, align: 'right' });

    currentY += 60;
    if (currentY + 50 > 740) {
      doc.addPage();
      currentY = 50;
    }

    // Signature Block
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
    
    doc.moveTo(100, currentY + 40).lineTo(250, currentY + 40).stroke('#334155');
    doc.text('Employee Signature', 100, currentY + 45, { width: 150, align: 'center' });

    doc.moveTo(350, currentY + 40).lineTo(500, currentY + 40).stroke('#334155');
    doc.text('Authorised By Signature', 350, currentY + 45, { width: 150, align: 'center' });

    // Footer on all pages
    const pages = doc.bufferedPageRange();
    for (let p = 0; p < pages.count; p++) {
      doc.switchToPage(p);
      doc.fillColor('#94a3b8').fontSize(7).font('Helvetica');
      doc.text(
        `Page ${p + 1} of ${pages.count}  •  Bright Flowers Trading LLC  •  Purchase & Petty Cash Management  •  Confidential`,
        40,
        doc.page.height - 30,
        { align: 'center', width: doc.page.width - 80 }
      );
    }

    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

router.get('/export/pdf', handlePdfExport);
router.post('/export/pdf', handlePdfExport);

// POST /api/reports/mark-exported - Explicitly mark expenses as exported in report
router.post('/mark-exported', async (req, res) => {
  try {
    const { expense_ids, report_id } = req.body;
    if (!Array.isArray(expense_ids) || expense_ids.length === 0) {
      return res.status(400).json({ success: false, error: 'expense_ids array is required' });
    }

    const now = new Date().toISOString();
    const exportDateStr = now.substring(0, 10).replace(/-/g, '');
    const updated = [];

    for (const id of expense_ids) {
      const exp = await db.getExpenseById(id);
      if (exp) {
        const empCode = (exp.employee_code || exp.employee_name || 'EMP').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'EMP';
        const voucherDateClean = (exp.expense_date || exportDateStr).replace(/-/g, '');
        const projTag = exp.project_name ? exp.project_name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) : '';
        const distinctReportId = report_id || (projTag ? `REP-${empCode}-${voucherDateClean}-${projTag}` : `REP-${empCode}-${voucherDateClean}`);
        exp.is_exported = true;
        exp.exported_at = now;
        exp.added_to_report = true;
        if (!exp.added_to_report_at) exp.added_to_report_at = now;
        exp.report_id = distinctReportId;
        const saved = await db.saveExpense(exp);
        updated.push(saved);
      }
    }

    res.json({
      success: true,
      updated_count: updated.length,
      expenses: updated,
      message: `Successfully locked ${updated.length} expense(s) as exported reports`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
