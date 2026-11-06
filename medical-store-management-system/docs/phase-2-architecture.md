# Enterprise Medical Store Management System — Phase 2 Architecture
## Medicine Catalogue & Inventory Management

### 1. Architectural Scope & Principles
- **Seamless Extension of Phase 1:** Build upon existing PostgreSQL database, Prisma ORM, Express API, Vite/React/Tailwind frontend, session authentication, and RBAC.
- **Strict Single-Store Domain Scope:** Centralized catalogue, batches, packaging conversions, multi-location stock balances, immutable ledger, stock adjustments/transfers/opening stock/counts, FEFO engine, expiry/low-stock reporting, CSV import/export.
- **Zero Hallucination / Strict Concurrency:**
  - Quantities and monetary values stored as `Decimal` (`@db.Decimal(12, 2)` or `(12, 4)` for unit conversions).
  - PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) inside transactions for stock mutations.
  - Immutable stock ledger: corrections generate compensating movements; balances are updated transactionally.
  - Idempotency key support for stock operations.
  - No negative stock permitted at any time.

---

### 2. Database Entities & Relationships
1. **Master Data:**
   - `MedicineCategory`: Name, code, description, isActive.
   - `Manufacturer`: Name, code, contactPerson, email, phone, address, isActive.
   - `DosageForm`: Name, code (e.g. TABLET, CAPSULE, SYRUP, INJECTION, OINTMENT, DROPS), isActive.
   - `AdministrationRoute`: Name, code (ORAL, TOPICAL, INTRAVENOUS, etc.), isActive.
   - `MeasurementUnit`: Name, symbol (mg, ml, g, mcg, IU), isActive.
   - `Composition`: Salt/molecule name, description.
   - `MedicineComposition`: Join table mapping Medicine to Composition with strength value and unit.
   - `Medicine`:
     - SKU, brandName, genericName, displayName, categoryId, manufacturerId, dosageFormId, administrationRouteId.
     - prescriptionRequired (boolean), regulatoryCategory (e.g., SCHEDULE_H, SCHEDULE_H1, SCHEDULE_X, OTC, GENERAL - configurable string/enum), hsnCode, gstRate (decimal).
     - baseUnit (e.g. "TABLET", "ML"), packUnit (e.g. "STRIP", "BOTTLE", "BOX"), unitsPerPack (decimal, default 1).
     - minStockLevel (decimal), storageConditions (text), sideEffects (text), isActive (boolean).
     - Relations to Batches, Barcodes, Compositions, StockBalances.
   - `MedicineBarcode`: Barcode string (unique), medicineId, packagingType (BASE_UNIT / PACK), isActive.

2. **Batches:**
   - `MedicineBatch`:
     - medicineId, batchNumber, manufacturingDate (DateTime @db.Date), expiryDate (DateTime @db.Date).
     - mrp (Decimal), purchasePrice (Decimal), sellingPrice (Decimal).
     - packConversionFactor (Decimal, default 1).
     - status (ACTIVE, QUARANTINED, EXPIRED, DEPLETED).
     - Unique constraint: `[medicineId, batchNumber]`.

3. **Locations & Stock Balances:**
   - `StockLocation`: Name, code (unique), type (MAIN_STORE, RACK, SHELF, CABINET, REFRIGERATOR), parentId (self-relation), isActive.
   - `StockBalance`: medicineId, batchId, locationId, quantityOnHand (Decimal), reorderThreshold (Decimal), lastMovementAt.
     - Unique constraint: `[batchId, locationId]`.

4. **Stock Operations & Immutable Ledger:**
   - `StockOperation`:
     - operationNumber (e.g., OP-2026-0001, unique).
     - type (OPENING_STOCK, ADJUSTMENT, TRANSFER, STOCK_COUNT).
     - status (DRAFT, SUBMITTED, APPROVED, REJECTED, POSTED).
     - idempotencyKey (unique nullable).
     - requestedById, approvedById, notes, metadata (Json).
   - `StockOperationItem`:
     - operationId, medicineId, batchId, sourceLocationId, destinationLocationId, quantity (Decimal), unitPrice (Decimal), reason, notes.
   - `StockMovement` (The Ledger):
     - batchId, locationId, operationId, movementType (OPENING_STOCK, ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE, EXPIRED, TRANSFER_IN, TRANSFER_OUT, STOCK_COUNT_VARIANCE).
     - quantityChange (Decimal, signed), quantityBefore (Decimal), quantityAfter (Decimal).
     - referenceDoc (String), reason (String), createdById, createdAt.

5. **Stock Counting:**
   - `StockCountSession`: sessionNumber, locationId, status (OPEN, IN_PROGRESS, SUBMITTED, APPROVED, REJECTED, POSTED), createdById, approvedById, notes.
   - `StockCountItem`: sessionId, medicineId, batchId, systemQuantity, countedQuantity, varianceQuantity, notes.

---

### 3. Backend Services & APIs
- **Master Data APIs:** `/api/v1/categories`, `/manufacturers`, `/dosage-forms`, `/units`, `/compositions`.
- **Medicine Catalogue APIs:** `/api/v1/medicines` (search by brand, generic, composition, barcode, category, manufacturer, SKU; create, update, deactivate).
- **Batch Management APIs:** `/api/v1/batches` (create batch, list by medicine, expiry filtering).
- **Inventory APIs:**
  - Locations: `/api/v1/inventory/locations`
  - Balance & Overview: `/api/v1/inventory/balances`, `/api/v1/inventory/overview`
  - Stock Ledger: `/api/v1/inventory/ledger`
  - Stock Operations:
    - Opening stock: `/api/v1/inventory/opening-stock` (draft, submit, approve, post)
    - Adjustments: `/api/v1/inventory/adjustments` (draft, submit, approve, reject, post)
    - Transfers: `/api/v1/inventory/transfers` (draft, post)
    - Stock counts: `/api/v1/inventory/counts` (create, record count, submit, approve, post)
- **FEFO Engine:**
  - Service: `fefoService.recommendBatches({ medicineId, requestedQuantity })` -> returns ordered batch allocations with remaining balances, excluding expired/zero-stock batches.
  - Endpoint: `GET /api/v1/inventory/fefo-preview`
- **Expiry & Low Stock Reports:**
  - `GET /api/v1/inventory/reports/expiry` (categorized: expired, <=30d, <=60d, <=90d, >90d)
  - `GET /api/v1/inventory/reports/low-stock`
  - `GET /api/v1/inventory/reports/valuation`
- **CSV Import/Export:**
  - `POST /api/v1/imports/medicines/preview` & `commit`
  - `POST /api/v1/imports/opening-stock/preview` & `commit`
  - `GET /api/v1/exports/inventory` (with CSV formula injection protection: prepending `'` to `=`, `+`, `-`, `@`)

---

### 4. RBAC & Security Matrix
- **OWNER:** Full access to all catalogue, batch, inventory, ledger, approval, and configuration actions.
- **PHARMACIST:** Catalogue view/create/edit; batch view/create; opening stock submit; stock adjustment submit (cannot approve own submission); transfer create/post; stock counting; ledger & expiry view.
- **BILLING_STAFF:** Read-only catalogue search, stock availability check, batch FEFO lookup. Strictly prohibited from creating/modifying catalogue, batches, or moving stock.
- **Audit Logging:** Every state change (create medicine, add batch, approve/reject adjustment, post movement, count variance) logged to `AuditLog`.

---

### 5. Frontend Screens & UX
- Sidebar navigation updated with dedicated sections for:
  - **Medicines:** Catalogue list, detail, create/edit, categories, manufacturers, dosage forms.
  - **Batches:** Batch inventory table, batch create/detail.
  - **Inventory Operations:** Stock balance view by location, opening stock, adjustments, transfers, physical stock count sessions.
  - **Reports:** Low-stock alerts, expiry monitor (interactive 30/60/90 day buckets), FEFO preview.
  - **Import / Export:** CSV import wizard with row-by-row validation feedback and CSV export.
- Role-specific Dashboard KPI enhancements:
  - Owner: active medicines, total stock, low stock count, expired count, expiring in 30/60/90 days, pending approvals, recent movements.
  - Pharmacist: active medicines, low-stock overview, expiry overview, pending submissions, quick search.
  - Billing Staff: quick medicine & stock availability search.

---

### 6. Verification & Automated Test Strategy
- **Unit Tests:** Pack conversions, expiry calculations, date boundary logic, FEFO allocations, decimal precision, CSV sanitization.
- **Integration Tests:** Full lifecycle of Medicine, Batch, Opening Stock, Approval, Ledger immutability, Adjustments, Transfers, Stock Counts.
- **Concurrency & Race Condition Tests:** Concurrent adjustments and transactions ensuring stock never goes below zero and no duplicate ledger entries are posted.
- **RBAC Tests:** Every endpoint verified for OWNER (allowed), PHARMACIST (scoped), BILLING_STAFF (read-only/blocked), Unauthenticated (401).
- **Browser Automation (Playwright / Subagent):** End-to-end execution of full workflow on running server.
- **Production Build:** `npm run build` across monorepo with 0 type errors.
