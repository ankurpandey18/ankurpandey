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
