const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const zohoRoutes = require('./routes/zohoRoutes');
const reportRoutes = require('./routes/reportRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const syncService = require('./services/syncService');
const { authenticateUser } = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Populate req.user from auth token/header
app.use(authenticateUser);

// Serve static uploads
const uploadDir = process.env.VERCEL === '1'
  ? path.join('/tmp', 'uploads')
  : path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (e) {
    console.warn('Could not create upload directory:', e.message);
  }
}

app.use('/uploads', express.static(uploadDir));
app.use('/api/uploads', express.static(uploadDir));

// Health check
app.get(['/api/health', '/health'], (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Petty Cash Zoho Books Sync API'
  });
});

// API Routes (support both /api/* and /* if prefix is stripped)
app.use(['/api/auth', '/auth'], authRoutes);
app.use(['/api/employees', '/employees'], employeeRoutes);
app.use(['/api/expenses', '/expenses'], expenseRoutes);
app.use(['/api/zoho', '/zoho'], zohoRoutes);
app.use(['/api/reports', '/reports'], reportRoutes);
app.use(['/api/webhooks', '/webhooks'], webhookRoutes);

// Serve client build if available
const clientDist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Background Cron Sync & Server (Local only)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
  syncService.init();

  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Petty Cash Management API running on port ${PORT}`);
    console.log(`📡 Zoho Books Sync & Supabase Bridge Active`);
    console.log(`🌐 Local App URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
  });
}

module.exports = app;
