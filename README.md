# FreshFlow POS 🛒⏱️
### Web-Based Expiry-Aware Inventory and Waste Reduction System for Retail Convenience Stores

Developed based on the research paper **"Systems Integration and Architecture 2 - CodeConnect Revised Paper"**  
**Authors:** John Brylle A. Col & Katrina A. Zantua (Section TW41)  
**Institution:** FEU Institute of Technology — College of Computer Studies  
**Adviser:** Prof. Jocelyn Tejada  

---

## 📖 System Overview

**FreshFlow POS** is designed specifically to address avoidable retail inventory waste. Traditional POS systems deduct inventory blindly without batch-level expiry awareness. FreshFlow POS connects checkout transactions directly with **batch tracking**, **expiry monitoring**, **First-Expiry, First-Out (FEFO)** rotation, and **manager-approved waste reduction actions**.

The core system question changes from:
> *"How many products are left?"*  
to:  
> *"Will these products likely be sold before they expire?"*

---

## 🚀 Key Features

1. **FEFO Inventory Allocation**: Automatically selects batches with the earliest expiry dates during checkout, minimizing the risk of older batches expiring unsold.
2. **Dynamic Expiry-Risk Classification**:
   - 🟢 **LOW**: > 30 days before expiry (normal monitoring)
   - 🟡 **MEDIUM**: 8 to 30 days before expiry (review movement)
   - 🟠 **HIGH**: 1 to 7 days before expiry (display priority / manager action needed)
   - 🔴 **EXPIRED**: Past expiry date (immediate removal from sale)
3. **Manager Approval Workflow**: Protects stock integrity by requiring manager authorization for discounts, display prioritizations, or product write-offs/disposals.
4. **Waste History & Accountability**: Durable audit tracking recording whether inventory was sold normally, discounted, removed, or recorded as waste.
5. **Real-Time Point of Sale (Cashier)**: Barcode search, cart management, FEFO preview, receipt generation, and duplicate transaction prevention with unique `saleId`s.
6. **Analytics & Reports**: Expiry trend graphs, daily risk metrics, waste value lost in Philippine Pesos (₱), and sales movement velocity.
7. **Security & Audit Logs**: Role-based access control (Cashier vs. Manager), JWT authentication, bcrypt passwords, and ISO/IEC 25010 & NIST-compliant audit logging.
8. **External API Integration (Open Food Facts Global API)**: Live product metadata resolution via `https://world.openfoodfacts.org`. When adding products, managers can enter or scan an EAN/UPC barcode to auto-populate the official product name, brand, category, and preview thumbnail.

---

## 🛠️ Technology Stack

- **Frontend**: React 19 + Vite + React Router DOM + Axios
- **Backend**: Node.js + Express.js
- **Database**: SQLite (via `better-sqlite3`, synchronous, ultra-fast, local ACID compliance)
- **Security**: JSON Web Tokens (JWT), bcrypt password hashing, parameterized SQL queries

---

## 🔑 Default Credentials

The database is pre-seeded with test accounts and sample convenience store items:

| Role | Username | Password | Access Rights |
| :--- | :--- | :--- | :--- |
| **Manager** | `admin` | `manager123` | Dashboard, Products, Batches, Expiry Risks, Alerts & Approvals, Waste History, Reports, Audit Logs |
| **Cashier** | `cashier1` | `cashier123` | POS Checkout, Product Lookups, Receipt Generation |

---

## 🏃 Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm**

### 2. Installation
To install dependencies for both backend and frontend:
```bash
# In the root directory (c:\CodeConnect):
npm run install:all
```

Or individually:
```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Running the Application

For QR Ph E-Wallet checkout, add your PayMongo test keys to `backend/.env`:

```env
PAYMONGO_SECRET_KEY=sk_test_your_secret_key
PAYMONGO_PUBLIC_KEY=pk_test_your_public_key
```

The backend creates a single-use QR Ph code for each E-Wallet sale. The cashier waits for PayMongo confirmation; only then does FreshFlow deduct stock and open the receipt. Use PayMongo test keys while testing. If PayMongo provides a `test_url`, the checkout shows a link to simulate payment. Do not scan and pay a test QR with a real wallet; PayMongo warns that it can process a real transaction. Cash checkout opens the receipt immediately after the sale succeeds. QR Ph requires a PayMongo account with the payment method enabled. A pending QR code normally expires after about 30 minutes.

Open two terminal windows:

#### Terminal 1 — Start the Backend Server (Port 5000)
```bash
cd backend
npm start
# Server will run at http://localhost:5000
# Database automatically initializes and seeds freshflow.db
```

#### Terminal 2 — Start the Frontend Development Server (Port 5173)
```bash
cd frontend
npm run dev
# Frontend will be accessible at http://localhost:5173
```

Open your browser and navigate to **`http://localhost:5173`** (or the port Vite outputs).

---

## 📁 Project Architecture & Structure

```
c:\CodeConnect\
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   ├── database.js      # SQLite connection & seed runner
│   │   │   └── schema.sql       # SQL DDL for 10 tables
│   │   ├── middleware/
│   │   │   ├── auth.js          # JWT & role verification (requireManager, requireAuth)
│   │   │   └── validate.js      # Request body & type sanitization
│   │   ├── routes/
│   │   │   ├── auth.js          # Authentication (login/logout)
│   │   │   ├── products.js      # Product catalog management
│   │   │   ├── batches.js       # Product batch & FEFO queries
│   │   │   ├── sales.js         # POS Checkout with FEFO & retries
│   │   │   ├── expiry.js        # Expiry risk assessment engine
│   │   │   ├── alerts.js        # Alerts & manager approvals
│   │   │   ├── reports.js       # Waste reports & trend analytics
│   │   │   └── audit.js         # Security audit logging
│   │   ├── services/
│   │   │   ├── expiryService.js # Expiry risk calculation & sales velocity
│   │   │   └── auditService.js  # Audit log persistence
│   │   ├── utils/
│   │   │   └── retry.js         # Exponential backoff retry handler (2s, 4s, 8s)
│   │   └── index.js             # Express app entry & hourly risk cron
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js         # Axios instance with JWT interceptor
│   │   ├── components/
│   │   │   └── Layout.jsx       # Responsive navigation & role-based sidebar
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx       # Authentication form
│   │   │   ├── CheckoutPage.jsx    # Cashier POS interface
│   │   │   ├── ReceiptPage.jsx     # Printable transaction receipt
│   │   │   ├── DashboardPage.jsx   # Manager KPI & status dashboard
│   │   │   ├── ProductsPage.jsx    # Product inventory manager
│   │   │   ├── BatchesPage.jsx     # Batch creation & FEFO viewer
│   │   │   ├── ExpiryRisksPage.jsx # Risk classification tables
│   │   │   ├── AlertsPage.jsx      # Manager alert approval/rejection
│   │   │   ├── WasteHistoryPage.jsx# Traceable waste history & loss metrics
│   │   │   ├── ReportsPage.jsx     # Analytical charts & summary
│   │   │   └── AuditLogsPage.jsx   # Security & system audit log viewer
│   │   ├── App.jsx              # Client routing & protected routes
│   │   └── main.jsx             # React entry point
│   └── package.json
│
├── package.json                 # Monorepo management scripts
└── README.md                    # System documentation
```

---

## 🧪 Testing Verification Scenarios

As specified in **Section 9 of the SIA 2 Paper**:
1. **FEFO Allocation Test**: Add two batches of Milk (one expiring in 3 days, another in 20 days). Ring up a sale in Cashier Checkout. Observe the earliest expiring batch is deducted first.
2. **Expiry Alert Generation**: Batches within 7 days automatically generate HIGH risk alerts. Log in as `admin` to the **Alerts** page to review recommendations (Prioritize Display or Review Discount).
3. **Manager Approval & Waste Record**: Approving a removal or discount records an entry into `WasteHistory` and updates `ProductBatches` accordingly.
4. **Duplicate Prevention**: Re-submitting the same `saleId` is rejected by the backend with an idempotency error.
5. **Security Verification**: Cashiers attempting to access manager endpoints or the `/dashboard` route are blocked and redirected to checkout.
