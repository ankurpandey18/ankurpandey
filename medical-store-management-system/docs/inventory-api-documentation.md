# Phase 2: Inventory & Medicine API Reference

## Base URL
`/api/v1`

All requests must include a valid session cookie established via `/api/v1/auth/login`.

---

## 1. Medicines
- `GET /medicines`: List medicines with pagination, search, category, manufacturer, and dosage form filters.
- `POST /medicines`: Create new medicine with SKU, barcodes, compositions, and packaging specifications.
- `GET /medicines/:id`: Retrieve medicine details, active barcodes, compositions, and batch summaries.
- `PUT /medicines/:id`: Update medicine metadata.
- `DELETE /medicines/:id`: Soft-deactivate medicine catalogue item.

## 2. Master Data
- `GET /master-data/categories`, `POST /master-data/categories`
- `GET /master-data/manufacturers`, `POST /master-data/manufacturers`
- `GET /master-data/dosage-forms`, `POST /master-data/dosage-forms`
- `GET /master-data/administration-routes`, `POST /master-data/administration-routes`
- `GET /master-data/measurement-units`, `POST /master-data/measurement-units`
- `GET /master-data/compositions`, `POST /master-data/compositions`
- `GET /master-data/locations`, `POST /master-data/locations`

## 3. Medicine Batches
- `GET /batches`: List batches with pagination, expiry filtering, and medicine lookup.
- `POST /batches`: Create a new batch with batchNumber, manufacturingDate, expiryDate, MRP, purchase price, selling price.
- `GET /batches/:id`: Retrieve single batch details and associated stock balances.
- `PATCH /batches/:id`: Update batch status (e.g. QUARANTINED, ACTIVE) or notes.

## 4. Inventory & Stock Balances
- `GET /inventory/overview`: Aggregated store metrics (total medicines, active batches, stock on hand, valuation).
- `GET /inventory/balances`: Query batch and location stock balances.
- `GET /inventory/ledger`: Paginated immutable movement history with filters for batch, location, and movement type.

## 5. Controlled Stock Operations

### Opening Stock
- `POST /inventory/opening-stock`: Create opening stock draft document.
- `POST /inventory/opening-stock/:id/submit`: Lock and submit draft for approval.
- `POST /inventory/opening-stock/:id/approve`: Owner approves document.
- `POST /inventory/opening-stock/:id/post`: Post movements to ledger and initialize stock balances.

### Stock Adjustments
- `POST /inventory/adjustments`: Submit stock adjustment request (`INCREASE`, `DECREASE`, `DAMAGE`, `EXPIRED`).
- `GET /inventory/adjustments`: List submitted and posted adjustments.
- `POST /inventory/adjustments/:id/decide`: Approve or reject adjustment.
- `POST /inventory/adjustments/:id/post`: Post approved adjustment to ledger.

### Stock Transfers
- `POST /inventory/transfers`: Execute atomic transfer between source and destination locations.
- `GET /inventory/transfers`: List historical transfers.

### Physical Stock Counts
- `POST /inventory/counts`: Create a new counting audit session.
- `GET /inventory/counts`: List counting sessions.
- `GET /inventory/counts/:id`: Get session details with item count snapshots.
- `POST /inventory/counts/:id/items`: Record counted physical quantities.
- `POST /inventory/counts/:id/submit`: Submit session for review.
- `POST /inventory/counts/:id/decide`: Owner approval of audit variances.
- `POST /inventory/counts/:id/post`: Reconcile and post `STOCK_COUNT_VARIANCE` movements.

## 6. FEFO Engine
- `GET /fefo/preview?medicineId=<UUID>&quantity=<number>`: Preview suggested batch allocation without side effects.

## 7. Reports
- `GET /reports/low-stock`: List medicines whose total available stock is below configured minimum threshold.
- `GET /reports/expiry`: Batch-wise expiry analysis categorized into `expired`, `within30Days`, `within60Days`, `within90Days`, and `beyond90Days`.

## 8. Data Import & Export
- `POST /imports/medicines/preview`: Dry-run CSV validation with row-by-row error reporting.
- `POST /imports/medicines/commit`: Atomic import of validated medicine rows.
- `POST /imports/opening-stock/preview`: Dry-run opening stock CSV validation.
- `POST /imports/opening-stock/commit`: Commit opening stock draft from CSV.
- `GET /imports/inventory/export`: Download stock balance CSV with formula injection sanitization.
