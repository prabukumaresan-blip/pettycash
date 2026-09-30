const express = require('express');
const router = express.Router();
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

  const {
    project_id,
    customer_id,
    start_date,
    end_date,
    sync_status,
    search
  } = query;

  let expenses = await db.getExpenses({
    employee_id: effectiveEmployeeId,
    project_id,
    start_date,
    end_date,
    search
  });

  if (customer_id) {
    expenses = expenses.filter(e => e.customer_id === customer_id);
  }
  if (sync_status) {
    expenses = expenses.filter(e => e.sync_status === sync_status);
  }

  return expenses;
}

// GET Report data & summaries
router.get('/', async (req, res) => {
  try {
    if (req.query.resync === 'true') {
      await syncService.syncPendingExpenses();
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

// GET Export to CSV
router.get('/export/csv', async (req, res) => {
  try {
    if (req.query.resync === 'true') {
      await syncService.syncPendingExpenses();
    }

    const expenses = await getFilteredExpenses(req.query, req.user);

    const fields = [
      { label: 'Date', value: 'expense_date' },
      { label: 'Employee', value: 'employee_name' },
      { label: 'Paid Through Account', value: row => row.paid_through_account_name || `Petty Cash - ${row.employee_name}` },
      { label: 'Expense Account', value: row => row.category_name || 'Petty Cash Purchases' },
      { label: 'Project', value: row => row.project_name || 'N/A' },
      { label: 'Amount (OMR)', value: row => parseFloat(row.amount || 0).toFixed(3) },
      { label: 'Description', value: 'description' },
      { label: 'Zoho Books Journal ID', value: row => row.zoho_journal_id || 'Pending Sync' },
      { label: 'Zoho Journal Number', value: row => row.zoho_journal_number || 'N/A' },
      { label: 'Sync Status', value: 'sync_status' }
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(expenses);

    res.header('Content-Type', 'text/csv');
    res.attachment(`petty_cash_report_${Date.now()}.csv`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET Export to PDF
router.get('/export/pdf', async (req, res) => {
  try {
    if (req.query.resync === 'true') {
      await syncService.syncPendingExpenses();
    }

    const expenses = await getFilteredExpenses(req.query, req.user);
    const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=petty_cash_report_${Date.now()}.pdf`);
    doc.pipe(res);

    // Header Branding
    doc.fillColor('#0f172a').fontSize(18).font('Helvetica-Bold').text('BRIGHT FLOWERS TRADING LLC', 40, 30);
    const claimName = expenses.length > 0 ? expenses[0].employee_name : 'Employee';
    doc.fillColor('#475569').fontSize(10).font('Helvetica').text(`Petty cash claim - ${claimName}`, 40, 56);

    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    doc.fillColor('#475569').fontSize(10).text(`Generated: ${dateStr}`, doc.page.width - 200, 35, { align: 'right', width: 160 });
    doc.text(`Total Records: ${expenses.length}`, doc.page.width - 200, 52, { align: 'right', width: 160 });

    doc.moveDown(4);

    // Summary Statistics Cards
    const cardY = 115;
    doc.rect(40, cardY, 160, 50).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#64748b').fontSize(9).font('Helvetica').text('TOTAL EXPENDITURE', 50, cardY + 10);
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text(`OMR ${totalAmount.toFixed(3)}`, 50, cardY + 24);

    // We are only displaying the Total Expenditure card now
    // Removed ZOHO SYNCED and PENDING APPROVAL cards

    // Table Header
    let currentY = 185;
    const tableTop = currentY;
    const colX = {
      date: 40,
      project: 120,
      notes: 240,
      amount: 470
    };

    doc.rect(40, tableTop, 515, 22).fill('#f1f5f9');
    doc.fillColor('#475569').fontSize(8).font('Helvetica-Bold');
    doc.text('DATE', colX.date + 5, tableTop + 6);
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
      doc.text(exp.expense_date, colX.date + 5, currentY + 2, { width: 65 });
      doc.text(exp.project_name || 'N/A', colX.project, currentY + 2, { width: 110, ellipsis: true });
      doc.text(exp.description || '', colX.notes, currentY + 2, { width: 220, ellipsis: true });

      doc.fillColor('#0f172a').font('Helvetica-Bold');
      doc.text(`${parseFloat(exp.amount).toFixed(3)}`, colX.amount, currentY + 2, { width: 85, align: 'right' });

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
});

module.exports = router;
