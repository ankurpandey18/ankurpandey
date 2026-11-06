# Security Architecture & Hardening — Phase 1

This document outlines the security controls, cryptography standards, and threat mitigations implemented in Phase 1 of the Enterprise Medical Store Management System.

---

## 1. Cryptography & Password Security

### Algorithm: Argon2id
- **Library**: `argon2` npm package (native bindings).
- **Configuration**:
  - Memory cost: 65536 KiB (64 MB)
  - Time cost: 3 iterations
  - Parallelism: 4 threads
  - Type: `argon2id` (hybrid resistant against side-channel and GPU cracking attacks)
- **Password Policy**:
  - Minimum 10 characters
  - At least 1 uppercase letter (`[A-Z]`)
  - At least 1 lowercase letter (`[a-z]`)
  - At least 1 numeric digit (`[0-9]`)
  - At least 1 special character (`[^A-Za-z0-9]`)
- **Forced Password Rotation**:
  - Newly created staff accounts have `mustChangePassword: true` by default.
  - API middleware blocks access to non-password-change endpoints until the user completes their initial password reset.

---

## 2. Session Management & Transport Security

### Stateful PostgreSQL Sessions
- Managed via `express-session` backed by `connect-pg-simple` with direct PostgreSQL persistence.
- **Session Cookie Properties**:
  - `httpOnly: true`: Prevents client-side script access via JavaScript (`document.cookie`), mitigating XSS session hijacking.
  - `sameSite: 'lax'`: Mitigates Cross-Site Request Forgery (CSRF).
  - `secure: true` (in production): Forces HTTPS transmission.
  - `maxAge: 8 hours`: Strict session expiration window.
- **Server-Side Invalidation**:
  - Explicit session destruction on `POST /api/v1/auth/logout`.
  - Account deactivation immediately blocks subsequent requests because session middleware validates user `status === 'ACTIVE'` on every request.

---

## 3. Defense-in-Depth Protections

### Rate Limiting
- Configured using `express-rate-limit`.
- Applied on `/api/v1/auth/login` to thwart automated credential stuffing and brute-force dictionary attacks.
- Standard limit: 5 failed attempts per 15 minutes per IP address.

### Security Headers (Helmet)
- Configured via `helmet`:
  - Content Security Policy (CSP)
  - HTTP Strict Transport Security (HSTS)
  - X-Frame-Options: `DENY` (Clickjacking mitigation)
  - X-Content-Type-Options: `nosniff` (MIME sniffing prevention)
  - Referrer-Policy: `strict-origin-when-cross-origin`

### CSRF Protection
- Double-Submit Cookie pattern for state-mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`).

---

## 4. Role-Based Access Control (RBAC)

### Deny-by-Default
- All application endpoints reject unauthenticated traffic by default.
- Every route handler attaches explicit permission requirements via `requirePermission(permKey)`.
- Client claims are never trusted; role memberships and permissions are verified against database records.

---

## 5. Audit Logging & Non-Repudiation

- All critical actions generate structured audit entries:
  - Actor Identity (`actorId`, `actorName`, `actorEmail`)
  - Network Metadata (`ipAddress`, `userAgent`, `requestId`)
  - Operation Context (`prevState`, `newState` with sensitive values redacted)
- Audit log records are append-only; update and delete operations are disallowed.
