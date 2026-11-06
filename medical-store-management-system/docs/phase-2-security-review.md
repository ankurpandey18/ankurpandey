# Phase 2: Security & Concurrency Review

## 1. Threat Model & Security Controls

| Threat | Impact | Security Mitigation |
|---|---|---|
| **Unauthorized Inventory Modification** | Inaccurate balances, theft concealment | Strict RBAC middleware (`requirePermission`) enforced at backend route level. Billing staff granted read-only catalogue access. |
| **Separation of Duties Bypass** | Pharmacist approves own adjustment | Service enforces that `requestedById !== approvedById` for stock adjustments. |
| **Race Conditions / Double-Spend** | Negative stock balances | Row-level locking (`SELECT ... FOR UPDATE`) in PostgreSQL transactions. Negative stock check before posting. |
| **CSV Formula Injection** | Remote code execution on client machines | Export cells starting with `=`, `+`, `-`, or `@` are sanitized with a leading single quote `'`. |
| **Timezone & Expiry Drift** | Expired batches dispensed | All expiry calculations use the server's business calendar (`Asia/Kolkata`), never trusting client device timestamps. |
| **Audit Evacuation** | Untracked stock changes | Every posted document triggers a structured audit log entry in `audit_logs` table. |

---

## 2. Role-Based Access Control Matrix

| Capability / API | OWNER | PHARMACIST | BILLING_STAFF |
|---|:---:|:---:|:---:|
| View Medicine Catalogue | ✅ | ✅ | ✅ |
| Create / Edit Medicine | ✅ | ✅ | ❌ |
| Create / Edit Batch | ✅ | ✅ | ❌ |
| View Stock Balances & Locations | ✅ | ✅ | ✅ |
| View Stock Ledger | ✅ | ✅ | ❌ |
| Submit Opening Stock | ✅ | ✅ | ❌ |
| Approve & Post Opening Stock | ✅ | ❌ | ❌ |
| Submit Stock Adjustment | ✅ | ✅ | ❌ |
| Approve & Post Stock Adjustment | ✅ | ❌ | ❌ |
| Execute Stock Transfer | ✅ | ✅ | ❌ |
| Conduct Stock Count | ✅ | ✅ | ❌ |
| Approve Stock Count Variance | ✅ | ❌ | ❌ |
| View Expiry & Low Stock Reports | ✅ | ✅ | ❌ |
| Export Inventory CSV | ✅ | ❌ | ❌ |

---

## 3. CSV Formula Injection Defense
When exporting CSV files, user-controlled fields (brand names, notes, batch numbers) are sanitized:
```typescript
function sanitizeCsvValue(val: string): string {
  if (/^[=+\-@\t\r]/.test(val)) {
    return `'${val}`;
  }
  return val;
}
```
This prevents formula execution in spreadsheet applications like Microsoft Excel or LibreOffice Calc.
