const { db } = require('../config/supabase');

// Optional auth: loads employee into req.user if x-employee-id header or Bearer token is provided
async function authenticateUser(req, res, next) {
  try {
    let empId = req.headers['x-employee-id'];
    const authHeader = req.headers['authorization'];

    if (!empId && authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      // Tokens are formatted as `pc-token-<employee_id>` or direct employee_id
      if (token.startsWith('pc-token-')) {
        empId = token.replace('pc-token-', '');
      } else {
        empId = token;
      }
    }

    if (empId) {
      const emp = await db.getEmployeeById(empId);
      if (emp && emp.is_active !== false) {
        req.user = emp;
        req.employee = emp;
      }
    }
  } catch (err) {
    console.warn('Auth extraction error:', err.message);
  }
  next();
}

// Strict requirement: must be logged in
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in.'
    });
  }
  next();
}

// Admin only requirement
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Administrative permissions required for this action.'
    });
  }
  next();
}

module.exports = {
  authenticateUser,
  requireAuth,
  requireAdmin
};
