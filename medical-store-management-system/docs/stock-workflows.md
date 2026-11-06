# Phase 2: Stock Workflows & Lifecycle Documentation

## Overview
Phase 2 implements four controlled inventory workflows to ensure that all stock changes are authorized, documented, and audited.

```
       ┌────────────────┐
       │     DRAFT      │
       └───────┬────────┘
               │ Submit
               ▼
       ┌────────────────┐
       │   SUBMITTED    │
       └───────┬────────┘
               │ Decide (Approve / Reject)
        ┌──────┴──────┐
        ▼             ▼
┌──────────────┐┌──────────────┐
│   APPROVED   ││   REJECTED   │
└───────┬──────┘└──────────────┘
        │ Post
        ▼
┌──────────────┐
│    POSTED    │  (Stock Balances Updated & Ledger Movements Recorded)
└──────────────┘
```

---

## 1. Opening Stock Workflow
Designed to initialize starting store inventory during store onboarding without inventing fake purchase orders or suppliers.

1. **Draft Creation (`POST /api/v1/inventory/opening-stock`)**:
   - User provides location, batch details, initial quantities, and cost prices.
   - Status: `DRAFT`.
2. **Submission (`POST /api/v1/inventory/opening-stock/:id/submit`)**:
   - Document reviewed and locked against field edits.
   - Status: `SUBMITTED`.
3. **Approval (`POST /api/v1/inventory/opening-stock/:id/approve`)**:
   - Only `OWNER` can approve. Pharmacist submission can be reviewed.
   - Status: `APPROVED`.
4. **Posting (`POST /api/v1/inventory/opening-stock/:id/post`)**:
   - Transactional execution: Creates `StockBalance` rows (or increments existing) and writes `OPENING_STOCK` ledger movements.
   - Status: `POSTED`.

---

## 2. Stock Adjustment Workflow
Handles physical damage, administrative adjustments, expired stock write-offs, or recount corrections.

- **Adjustment Types**:
  - `INCREASE`: Administrative addition (`ADJUSTMENT_IN`).
  - `DECREASE`: Administrative reduction (`ADJUSTMENT_OUT`).
  - `DAMAGE`: Damaged vials, dropped syrup bottles, moisture damage (`DAMAGE`).
  - `EXPIRED`: Removal of expired batches (`EXPIRED`).
- **Separation of Duties**:
  - `PHARMACIST` can create and submit adjustments.
  - A pharmacist CANNOT approve their own submitted adjustment.
  - `OWNER` reviews and approves or rejects the adjustment.
- **Posting**:
  - Row-lock verified. Decreases that exceed current on-hand balance are rejected with `400 Bad Request`.
  - Immutable movement recorded in ledger.

---

## 3. Stock Transfer Workflow
Atomic movement of inventory between store locations (e.g., Main Storeroom -> Front Dispensary Rack or Refrigerator).

- **API Endpoint**: `POST /api/v1/inventory/transfers`.
- **Validation**:
  - Source and destination locations must be distinct active locations.
  - Source location must hold sufficient on-hand quantity for the target batch.
- **Atomic Double-Movement**:
  - Source: Decrements balance, writes `TRANSFER_OUT` movement.
  - Destination: Increments balance, writes `TRANSFER_IN` movement.
  - Both sides are wrapped in a single database transaction; failure on either rolls back both.

---

## 4. Physical Stock Counting & Verification
Conducting audits and physical spot checks without stopping store operations.

1. **Session Creation (`POST /api/v1/inventory/counts`)**:
   - Store manager selects location (or entire store) and batches to audit.
   - System takes snapshot of `systemQuantity` at session creation.
   - Status: `DRAFT`.
2. **Count Entry**:
   - Physical count recorded (`countedQuantity`).
   - Calculated `varianceQuantity = countedQuantity - systemQuantity`.
3. **Submission (`POST /api/v1/inventory/counts/:id/submit`)**:
   - Count sheet submitted for audit review.
4. **Approval & Posting (`POST /api/v1/inventory/counts/:id/approve`, `.../post`)**:
   - Owner reviews variances and notes.
   - Upon posting, reconciliation checks current live balance against the snapshot under row-level locking.
   - Generates `STOCK_COUNT_VARIANCE` movement for the net difference.
