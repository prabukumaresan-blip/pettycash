# 💰 PettyCash Pro — Zoho Books & Supabase Petty Cash Management

A mobile-first, enterprise-grade Petty Cash Management Web Application built with **Node.js (Express)**, **Supabase (PostgreSQL + Auth + Storage)**, and **React (Vite + Tailwind CSS)** that integrates with **Zoho Books API**.

---

## 🌟 Key Highlights & Features

- **Tightly Integrated with Zoho Books (No Zoho Expense required):**
  - **OAuth 2.0 Flow**: Token refresh handling, multiple Data Centers (US, IN, EU, AU, JP, CA).
  - **Chart of Accounts Sync**: Maps Zoho expense accounts (e.g. Travel, Refreshments, Supplies) and employee cash accounts.
  - **Projects & Cost Tracking**: Fetches active Zoho Projects and Customers/Vendors for precise job costing.
  - **Bi-directional Journal Sync**: Logging an expense posts balanced journal entries in Zoho Books:
    - **Debit**: Relevant expense account (with Project ID & Customer ID attached).
    - **Credit**: Dedicated Employee Petty Cash Account.
  - **Reversals**: Editing or deleting an expense automatically updates or reverses the journal entry in Zoho Books.
  - **Background Sync**: Automated `node-cron` background sync runs every 15 minutes to push pending or failed submissions.
  - **Sandbox / Simulation Mode**: Built-in toggle to test the full app offline or without live credentials.

- **Mobile-First & Touch-Optimized Design:**
  - Designed for iOS Safari, Android Chrome, tablets, and desktops.
  - Camera integration: Snap receipts on-site with native camera trigger (`capture="environment"`).
  - PWA Support: `manifest.json` and Service Worker for an installable, app-like experience.
  - Offline-first draft queue: Record expenses in the field without internet; auto-syncs when online.

- **Employee Float & Wallet Management:**
  - Real-time balance recalculation via PostgreSQL triggers / DB service.
  - Dedicated Petty Cash account mapping for each team member.
  - Admin float replenishment (top-up) with audit logging.

- **Audit & Reporting Suite:**
  - Standardized on **Omani Rial (OMR)** with standard 3-decimal (Baisa) precision (`OMR 0.000`).
  - Filter by date range (with quick presets like "This Month", "Last 30 Days", "YTD"), Employee, Project, Customer, or Cost Center.
  - Live financial analytics & breakdown charts.
  - One-click **Export to CSV** and **Export to Audit PDF** (with PDFKit formatted statements).
  - "Re-sync from Zoho Books" button for on-demand ledger updates.

---

## 📐 Architecture

```
/Users/prabhu/Documents/Development/Cash/
├── server/
│   ├── src/
│   │   ├── config/supabase.js     # Supabase PostgreSQL client & local fallback store
│   │   ├── services/
│   │   │   ├── zohoBooksService.js # Zoho Books OAuth 2.0, COA, Projects, & Journal entries
│   │   │   └── syncService.js      # Background node-cron scheduler & batch sync
│   │   ├── routes/
│   │   │   ├── employeeRoutes.js  # Team CRUD, float top-ups, Zoho account creation
│   │   │   ├── expenseRoutes.js   # Expense logging, receipt uploads, Zoho sync triggers
│   │   │   ├── zohoRoutes.js      # OAuth callback, settings, synced cache explorer
│   │   │   ├── reportRoutes.js    # Statement querying, CSV & PDF export
│   │   │   └── webhookRoutes.js   # Zoho Books inbound webhooks
│   │   └── index.js               # Express application entry point
│   ├── uploads/                   # Local receipt uploads directory
│   ├── .env.example               # Environment variables template
│   └── package.json
│
├── client/
│   ├── public/
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                  # Service Worker for offline caching
│   │   ├── icon-192.svg           # Vector App Icon 192px
│   │   └── icon-512.svg           # Vector App Icon 512px
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Header with user switcher, status, install app
│   │   │   ├── MobileBottomNav.jsx # Sticky bottom bar with quick '+' action
│   │   │   ├── ExpenseCard.jsx     # Touch-friendly card with receipt & journal badge
│   │   │   ├── LogExpenseModal.jsx # Camera snap, amount input, Zoho dropdowns
│   │   │   ├── ReceiptViewerModal.jsx # Full-screen receipt preview lightbox
│   │   │   ├── TopupModal.jsx      # Admin float top-up modal
│   │   │   ├── EmployeeModal.jsx   # Employee profile & Zoho account creation
│   │   │   └── OfflineBanner.jsx   # Offline drafts notification & sync action
│   │   ├── views/
│   │   │   ├── DashboardView.jsx   # Wallet balance, gauge, quick filters, activity
│   │   │   ├── ReportsView.jsx     # Financial statements, breakdown charts, CSV/PDF
│   │   │   ├── EmployeesView.jsx   # Team float tracking & account mapping
│   │   │   └── ZohoSettingsView.jsx# OAuth credentials, mock mode, logs & cache
│   │   ├── utils/api.js           # API client with offline draft queue
│   │   ├── App.jsx                # Main application state and coordinator
│   │   └── index.css              # Modern Tailwind v4 styling with safe areas
│   └── package.json
│
├── supabase-schema.sql            # Supabase PostgreSQL schema with tables & triggers
└── package.json                   # Root package runner
```

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Configure Environment Variables
Copy `.env.example` in `server/` to `server/.env`:
```bash
cp server/.env.example server/.env
```
Fill in your credentials (or leave blank to use the pre-configured local simulation sandbox):
```env
PORT=5000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Zoho Books OAuth 2.0 (From Zoho Developer Console)
ZOHO_CLIENT_ID=1000.YOUR_CLIENT_ID
ZOHO_CLIENT_SECRET=YOUR_CLIENT_SECRET
ZOHO_REDIRECT_URI=http://localhost:5000/api/zoho/callback
ZOHO_ORG_ID=YOUR_ORGANIZATION_ID
ZOHO_DC=com
```

### 3. Setup Supabase PostgreSQL (Optional for live database)
Open your [Supabase Dashboard](https://app.supabase.com) → **SQL Editor** → Run the contents of:
[`supabase-schema.sql`](file:///Users/prabhu/Documents/Development/Cash/supabase-schema.sql)

This provisions:
- `employees` (with balances and Zoho account mappings)
- `expenses` (with Zoho journal numbers and sync states)
- `petty_cash_topups` (for float audit history)
- `zoho_config`, `zoho_accounts_cache`, `zoho_projects_cache`, `zoho_contacts_cache`
- PostgreSQL function & triggers to auto-recalculate employee balances

### 4. Build and Run the Application
```bash
# Build the React frontend
npm run build

# Start the Node.js Express server
npm run start
```
Open your browser or mobile device to:
**`http://localhost:5000`**

*(For hot-reloading React development, run `npm run client` in parallel on `http://localhost:5173`)*

---

## 📱 Mobile & PWA Usage

- **Camera Integration**: Tap **"+ Log Expense"** → Tap **"Take Photo"** to open your mobile camera and capture physical receipts directly.
- **Install App (PWA)**: In mobile Safari (iOS) tap **Share** → **Add to Home Screen**, or on Android Chrome tap the **"Install App"** prompt in the header to run it as a standalone app.
- **Offline Mode**: If you lose mobile signal in the field, submit expenses as usual. The app automatically stores drafts in local storage and provides a **"Sync Now"** banner as soon as connectivity resumes.

---

## 🔗 Zoho Books OAuth Setup Details

1. Go to the [Zoho API Console](https://api-console.zoho.com).
2. Click **Add Client** → Select **Server-based Applications**.
3. Set:
   - **Client Name**: `Petty Cash Pro`
   - **Homepage URL**: `http://localhost:5000`
   - **Authorized Redirect URIs**: `http://localhost:5000/api/zoho/callback`
4. Copy your **Client ID** and **Client Secret** into the app's **Zoho Integration** tab or `.env`.
5. Required API Scope: `ZohoBooks.fullaccess.all`.
