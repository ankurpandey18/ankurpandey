# Phase 2: Testing & Verification Report

## Test Execution Summary

| Test Suite | Location | Tests Executed | Passed | Failed | Pass Rate |
|---|---|:---:|:---:|:---:|:---:|
| **Phase 2 Pure Unit Tests** | `apps/api/tests/unit/phase2_unit.test.ts` | 13 | 13 | 0 | 100% |
| **Phase 2 Inventory Integration** | `apps/api/tests/integration/phase2_inventory.test.ts` | 12 | 12 | 0 | 100% |
| **Phase 2 RBAC Integration** | `apps/api/tests/integration/phase2_rbac.test.ts` | 12 | 12 | 0 | 100% |
| **Phase 1 Auth Integration** | `apps/api/tests/integration/auth.test.ts` | 12 | 12 | 0 | 100% |
| **Phase 1 Schema Validation** | `apps/api/tests/unit/schemas.test.ts` | 14 | 14 | 0 | 100% |
| **AppSec Audit Suite** | `apps/api/tests/integration/security_audit.test.ts` | 7 | 7 | 0 | 100% |
| **Frontend UI Component Tests** | `apps/web/src/__tests__/ui.test.tsx` | 9 | 9 | 0 | 100% |
| **Frontend Utility Tests** | `apps/web/src/__tests__/utils.test.ts` | 7 | 7 | 0 | 100% |
| **Frontend Phase 2 UI Tests** | `apps/web/src/__tests__/phase2_ui.test.tsx` | 4 | 4 | 0 | 100% |
| **Total Automated Tests** | Across Monorepo | **90** | **90** | **0** | **100%** |

---

## Key Test Cases Verified

### 1. Concurrency & Negative Stock Protection
- **Test:** `Blocks adjustments that exceed on-hand balance` (`phase2_inventory.test.ts`)
- **Action:** Current stock is 120. Attempted decrease of 500 units.
- **Result:** API transaction rejected with `400 Bad Request: Insufficient stock for batch`. On-hand balance remained untouched at 120.

### 2. FEFO (First Expiry, First Out) Algorithm
- **Test:** `Recommends earliest expiry batch with sufficient stock` (`phase2_inventory.test.ts`)
- **Action:** Two batches available with different expiries. Requested quantity requested.
- **Result:** Earliest expiring batch allocated first; zero-stock and expired batches filtered out.

### 3. Role-Based Access Control (RBAC)
- **Billing Staff Enforcements:** Verified 403 Forbidden when attempting to create medicines, create batches, submit opening stock, submit adjustments, or execute transfers.
- **Pharmacist Enforcements:** Permitted to create medicines and submit adjustments, but blocked with 403 when attempting to approve or post opening stock or adjustments.

### 4. Date Normalization & Expiry Boundaries
- **Test:** `parseDateLabelToCalendarEnd` handles `MM/YYYY` labels by returning the last calendar date of the month in `Asia/Kolkata` timezone (e.g. `02/2026` -> `2026-02-28`).

### 5. CSV Import & Export
- **Test:** Preview validates missing required fields and duplicate SKUs. Commit imports records cleanly in a database transaction. Export attaches injection protection prefix to sensitive strings.

---

## Browser End-to-End Verification
Browser automation was executed against the running dev server (`http://localhost:5180` and `http://localhost:3001`):
1. **Owner Flow**: Logged in, viewed KPI widgets (Active Medicines: 2, Batches: 3, Expired: 1, Low Stock: 1, Pending Approvals: 1). Navigated through Medicines catalogue, Add Medicine form, Batches, Inventory, Stock Ledger, Adjustments, Expiry Monitor, and FEFO Simulator.
2. **Pharmacist Flow**: Logged in, verified access to catalogue, creation forms, and dashboard.
3. **Console & Network**: Zero fatal uncaught exceptions or rendering crashes.
