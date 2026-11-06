# Architecture & System Design — Phase 1

## Overview

The Enterprise Medical Store Management System is designed as a modular monorepo utilizing npm workspaces. It separates concerns strictly into presentation (React Single Page Application), domain logic and orchestration (Express REST API), shared contracts and schemas (Shared Zod & TypeScript package), and persistent storage (PostgreSQL via Prisma ORM).

```
                      ┌───────────────────────────────┐
                      │    React + Vite Client        │
                      │  (Tailwind, React Router,     │
                      │   TanStack Query, UI Guards)  │
                      └──────────────┬────────────────┘
                                     │ HTTP Cookies & JSON
                                     ▼
                      ┌───────────────────────────────┐
                      │      Express 4 REST API       │
                      │  (Helmet, CORS, Rate Limit,   │
                      │   Session Store, RBAC Engine) │
                      └──────────────┬────────────────┘
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
       ┌───────────────────────────┐   ┌───────────────────────────┐
       │   PostgreSQL Database     │   │   Shared Schema Package   │
       │  (Users, Roles, Profiles, │   │  (@medstore/shared)       │
       │   AuditLogs, Sessions)    │   │  (Zod, Types, Permissions)│
       └───────────────────────────┘   └───────────────────────────┘
```

---

## Domain Models & Database Schema

The database schema is managed via Prisma migrations and normalized for performance, referential integrity, and compliance:

### 1. `User`
- Central identity entity.
- Fields: `id` (UUID), `name`, `email` (unique index), `phone`, `passwordHash`, `status` (`ACTIVE`, `INACTIVE`), `mustChangePassword`, `lastLogin`, timestamps.

### 2. `Role` & `Permission`
- Normalized many-to-many relationship (`RolePermission` junction).
- Initial Roles: `OWNER`, `PHARMACIST`, `BILLING_STAFF`.
- Permission Granularity: `employees:read`, `employees:write`, `employees:deactivate`, `audit:read`, `dashboard:owner`, `dashboard:pharmacist`, `dashboard:billing`, `users:read-own`, `users:write-own`, `roles:assign`, `sessions:revoke`.

### 3. `EmployeeProfile`
- One-to-one extension of `User`.
- Fields: `employeeCode` (unique, e.g. `EMP001`), `joiningDate`.

### 4. `Session`
- Backed by PostgreSQL table managed via `connect-pg-simple`.
- Facilitates server-side session termination, concurrent login monitoring, and prevents token theft persistence.

### 5. `AuditLog`
- Immutable append-only log of sensitive security and administrative operations.
- Fields: `id`, `actorId`, `actorName`, `actorEmail`, `action`, `entityType`, `entityId`, `ipAddress`, `userAgent`, `requestId`, `prevState` (JSON), `newState` (JSON), `createdAt`.

### 6. `LoginAttempt`
- Tracks all authentication attempts for security auditing and telemetry.
- Fields: `id`, `email`, `ipAddress`, `success`, `userAgent`, `createdAt`.

---

## Module Breakdown

### `modules/auth`
- Handles user authentication, logout, session retrieval (`/me`), password changing, and initial login password enforcement.
- Rate-limited to 5 requests per 15 minutes per IP on `/login`.
- Emits `LOGIN_SUCCESS` and `LOGIN_FAILED` audit events.

### `modules/employees`
- Restricted to users with `employees:read`, `employees:write`, and `employees:deactivate` permissions (`OWNER`).
- Handles employee listing (with search and status filters), profile creation with automatic temporary password generation, status toggles (activate/deactivate), and password resets.

### `modules/dashboard`
- Role-specific telemetry endpoints:
  - `/dashboard/owner`: Live employee counts by role and status, login activity, recent audit events.
  - `/dashboard/pharmacist`: Pharmacy alerts, prescription dispatch counters, quick actions.
  - `/dashboard/billing-staff`: Daily sales counters, POS status, active terminal summary.

### `modules/audit`
- Restricted to users with `audit:read` permission.
- Paginated, filterable by action, entity type, date range, or actor.
