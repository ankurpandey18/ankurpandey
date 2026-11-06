# Enterprise Medical Store Management System

A production-ready, enterprise-grade Medical Store Management System designed for multi-role pharmacy operations. Built with modern, secure, and maintainable software engineering practices.

---

## 🌟 Phase 1 Implementation Scope

Phase 1 establishes the foundational enterprise infrastructure:
- **Authentication & Session Management**: Argon2id password hashing, PostgreSQL-backed stateful HTTP-only sessions, brute-force rate limiting, double-submit CSRF protection, and forced password changes.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions enforced on both backend routes and frontend UI guards across 3 initial roles:
  - `OWNER`: Full administrative access, employee management, audit log inspection, business dashboard.
  - `PHARMACIST`: Pharmacy operations, dispensing metrics, prescription dashboard.
  - `BILLING_STAFF`: Point of Sale (POS) operations, daily sales counters, billing dashboard.
- **Employee Lifecycle Management**: Secure creation, activation, deactivation, password reset, and role assignment.
- **Comprehensive Audit Trail**: Immutable logging of all sensitive actions (logins, logouts, employee provisioning, role alterations, password resets) with actor metadata, IP addresses, and state diffs.
- **Dashboards**: Role-tailored dashboards querying real database statistics and audit telemetry.
- **CLI Bootstrapper**: Secure CLI script for initial Owner account creation (never exposed via HTTP).

---

## 💊 Phase 2 Implementation Scope: Medicine Catalogue & Inventory Management

Phase 2 builds seamlessly upon Phase 1 without breaking any existing features:
- **Centralized Medicine Catalogue**: Complete medicine master with SKU, brand/trade name, generic formulation, Indian regulatory classifications (`SCHEDULE_H`, `SCHEDULE_H1`, `SCHEDULE_X`, `OTC`, `GENERAL`), HSN tax codes, and GST rates.
- **Classification Masters**: Dedicated master management for Categories, Manufacturers, Dosage Forms (Tablets, Capsules, Syrups, Injections, Ointments, Drops), Administration Routes, and Measurement Units.
- **Multi-Salt Compositions & Barcodes**: Multi-ingredient potency mapping and packaging barcode conversion (`BASE_UNIT` vs `PACK`).
- **Batch Management**: Batch-wise tracking with manufacturing date, expiry date (normalized to end of month in `Asia/Kolkata`), MRP, purchase cost, selling price, and real-time days-until-expiry badges.
- **Multi-Location Inventory**: Single-store hierarchy (Main Store, Racks, Shelves, Cabinets, Refrigerators) with real-time stock balances at `(batchId, locationId)` granularity.
- **Immutable Stock Ledger**: Append-only transaction ledger (`StockMovement`) recording `OPENING_STOCK`, `ADJUSTMENT_IN/OUT`, `DAMAGE`, `EXPIRED`, `TRANSFER_IN/OUT`, and `STOCK_COUNT_VARIANCE`.
- **Concurrency & Negative Stock Protection**: Row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL transactions guaranteeing zero negative inventory.
- **Controlled Workflows**:
  - **Opening Stock**: `DRAFT` → `SUBMITTED` → `APPROVED` → `POSTED` lifecycle.
  - **Stock Adjustments**: Separation of duties (Pharmacist cannot self-approve; Owner reviews and posts).
  - **Stock Transfers**: Atomic location-to-location double movements in a single transaction.
  - **Physical Stock Counts**: Audit sessions with snapshot balances, variance calculation, and approved variance posting.
- **FEFO Recommendation Engine**: Pure First Expiry, First Out batch allocation algorithm with tie-breaking and automatic multi-batch splitting.
- **Expiry & Low Stock Reports**: Real-time analytical monitors (Expired, 30d, 60d, 90d buckets; low-stock alerts based on configured reorder thresholds).
- **Validated CSV Import/Export**: Dry-run preview, row-level validation, and formula injection (`=`, `+`, `-`, `@`) sanitization.
- **Role Integration**: Enforced backend permissions across `OWNER`, `PHARMACIST`, and `BILLING_STAFF` with real-time dashboard widgets.

### Phase 2 Documentation Suite
- [Architecture & Design](file:///docs/phase-2-architecture.md)
- [Medicine Master Data Model](file:///docs/medicine-data-model.md)
- [Stock Ledger & Concurrency](file:///docs/inventory-ledger-design.md)
- [Stock Workflows & Lifecycles](file:///docs/stock-workflows.md)
- [FEFO Recommendation Logic](file:///docs/fefo-logic.md)
- [API Reference](file:///docs/inventory-api-documentation.md)
- [Security & RBAC Review](file:///docs/phase-2-security-review.md)
- [Testing & Verification Report](file:///docs/phase-2-testing-report.md)
- [Phase 2 Completion Report](file:///docs/phase-2-completion-report.md)

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
|---|---|
| **Monorepo** | npm Workspaces (`apps/api`, `apps/web`, `packages/shared`) |
| **Backend** | Node.js (v20+), Express 4, TypeScript (strict), Prisma ORM 5, PostgreSQL 16 |
| **Authentication** | `argon2` (Argon2id), `express-session`, `connect-pg-simple`, `express-rate-limit`, `helmet` |
| **Frontend** | React 18, Vite 5, TypeScript (strict), TailwindCSS, TanStack Query v5, Lucide Icons |
| **Shared** | Zod schemas, TypeScript contracts, Role & Permission definitions |
| **Testing** | Vitest (API integration & unit tests, React testing-library for web UI) |
| **CI/CD** | GitHub Actions (`.github/workflows/ci.yml`) |

---

## 📁 Repository Structure

```
medical-store-management-system/
├── apps/
│   ├── api/                     # Express REST API
│   │   ├── prisma/              # Prisma schema, migrations, seed
│   │   ├── src/
│   │   │   ├── config/          # Environment configuration
│   │   │   ├── middleware/      # Auth, RBAC, error handling, rate limiting
│   │   │   ├── modules/         # Auth, employees, dashboard, audit modules
│   │   │   ├── scripts/         # bootstrap-owner.ts CLI
│   │   │   └── server.ts        # Express application bootstrap
│   │   └── tests/               # Unit and integration test suites
│   └── web/                     # React + Vite Single Page Application
│       ├── src/
│       │   ├── components/      # UI components (Button, Input, Badge, etc.)
│       │   ├── context/         # AuthContext & ToastContext
│       │   ├── hooks/           # Custom React hooks
│       │   ├── pages/           # Login, Dashboards, Employees, Audit, Profile
│       │   ├── routes/          # ProtectedRoute, RoleGuard, App router
│       │   └── services/        # Type-safe API client
│       └── src/__tests__/       # Web unit & component tests
├── packages/
│   └── shared/                  # Shared Zod schemas, types, RBAC constants
├── docs/                        # Architecture, security & Phase 1 completion reports
├── .github/workflows/ci.yml     # Automated CI pipeline
├── .env.example                 # Environment configuration template
└── package.json                 # Monorepo root configuration
```

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Node.js**: v20 or v22 LTS recommended
- **PostgreSQL**: v14+ running locally (e.g., via Homebrew on macOS or local service)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```
Update `.env` if your PostgreSQL credentials or ports differ:
```env
DATABASE_URL="postgresql://ankurpandey@localhost:5432/medstore_dev"
PORT=3001
NODE_ENV=development
SESSION_SECRET="super_secret_session_key_minimum_32_characters_long_for_security"
CORS_ORIGIN="http://localhost:5180"
```

### 3. Install Dependencies & Build Packages
```bash
npm install
npm run build --workspace=@medstore/shared
```

### 4. Database Setup & Migrations
```bash
# Run Prisma migrations
npm run db:migrate --workspace=@medstore/api

# Seed system roles and permissions
npm run db:seed --workspace=@medstore/api
```

### 5. Bootstrap the Owner Account
Run the secure CLI bootstrapper:
```bash
npm run bootstrap:owner --workspace=@medstore/api
```
Follow the interactive prompts to create the initial store owner account:
- **Full Name**: Store Owner
- **Email**: `owner@medstore.local`
- **Employee Code**: `OWN001`
- **Password**: Min 10 chars (with upper, lower, digit, and symbol, e.g. `Owner@Secure123!`)

*(Note: Can also be run non-interactively using environment variables `BOOTSTRAP_NAME`, `BOOTSTRAP_EMAIL`, `BOOTSTRAP_CODE`, `BOOTSTRAP_PASSWORD`).*

### 6. Start Development Servers
Start both backend API and frontend Vite dev servers concurrently:
```bash
npm run dev
```
- **Backend API**: http://localhost:3001 (`/health`, `/api/v1/*`)
- **Frontend App**: http://localhost:5180

---

## 🧪 Testing, Linting & Typechecking

Run all validation suites across the monorepo:

```bash
# Run all unit and integration tests (API & Web)
npm test

# Typecheck all workspaces (strict TypeScript)
npm run typecheck

# Lint all workspaces with ESLint
npm run lint

# Production build test
npm run build
```

---

## 🔒 Security Specifications

- **Argon2id**: Memory-hard password hashing parameters ($m=65536, t=3, p=4$).
- **Stateful Sessions**: Stored in PostgreSQL `session` table; cookie configured with `httpOnly: true`, `sameSite: 'lax'`, `secure: production`.
- **Double-Submit CSRF**: State-changing operations protected against cross-site request forgery.
- **Rate Limiting**: `express-rate-limit` prevents brute-force credential stuffing on `/api/v1/auth/login`.
- **Security Headers**: `helmet` enforces strict HTTP security headers (CSP, HSTS, X-Frame-Options).
- **Deny-by-Default Authorization**: All routes require explicit authentication and specific permissions.

---

## 📜 License
Proprietary — Enterprise Medical Store Management System. All rights reserved.
