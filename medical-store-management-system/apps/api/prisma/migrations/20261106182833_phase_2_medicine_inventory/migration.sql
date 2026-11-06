-- CreateEnum
CREATE TYPE "PackagingType" AS ENUM ('BASE_UNIT', 'PACK');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'QUARANTINED', 'EXPIRED', 'DEPLETED');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('MAIN_STORE', 'RACK', 'SHELF', 'CABINET', 'REFRIGERATOR');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('OPENING_STOCK', 'ADJUSTMENT', 'TRANSFER', 'STOCK_COUNT');

-- CreateEnum
CREATE TYPE "OperationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('OPENING_STOCK', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRED', 'TRANSFER_IN', 'TRANSFER_OUT', 'STOCK_COUNT_VARIANCE');

-- CreateTable
CREATE TABLE "medicine_categories" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manufacturers" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "contactPerson" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manufacturers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosage_forms" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" VARCHAR(255),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosage_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "administration_routes" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "administration_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "measurement_units" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "description" VARCHAR(100),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "measurement_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compositions" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_compositions" (
    "id" SERIAL NOT NULL,
    "medicineId" UUID NOT NULL,
    "compositionId" INTEGER NOT NULL,
    "strengthValue" DECIMAL(10,4),
    "unitId" INTEGER,

    CONSTRAINT "medicine_compositions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" UUID NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "brandName" VARCHAR(150) NOT NULL,
    "genericName" VARCHAR(200) NOT NULL,
    "displayName" VARCHAR(255) NOT NULL,
    "categoryId" INTEGER,
    "manufacturerId" INTEGER,
    "dosageFormId" INTEGER,
    "administrationRouteId" INTEGER,
    "prescriptionRequired" BOOLEAN NOT NULL DEFAULT false,
    "regulatoryCategory" VARCHAR(50),
    "hsnCode" VARCHAR(20),
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 12.00,
    "baseUnit" VARCHAR(30) NOT NULL DEFAULT 'TABLET',
    "packUnit" VARCHAR(30) NOT NULL DEFAULT 'STRIP',
    "unitsPerPack" DECIMAL(10,2) NOT NULL DEFAULT 10.00,
    "minStockLevel" DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    "storageConditions" VARCHAR(255),
    "sideEffects" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_barcodes" (
    "id" SERIAL NOT NULL,
    "barcode" VARCHAR(100) NOT NULL,
    "medicineId" UUID NOT NULL,
    "packagingType" "PackagingType" NOT NULL DEFAULT 'BASE_UNIT',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicine_barcodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicine_batches" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchNumber" VARCHAR(100) NOT NULL,
    "manufacturingDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "mrp" DECIMAL(12,2) NOT NULL,
    "purchasePrice" DECIMAL(12,2) NOT NULL,
    "sellingPrice" DECIMAL(12,2) NOT NULL,
    "packConversionFactor" DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    "status" "BatchStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" VARCHAR(500),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medicine_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" "LocationType" NOT NULL DEFAULT 'RACK',
    "description" VARCHAR(255),
    "parentId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_balances" (
    "id" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "quantityOnHand" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "reorderThreshold" DECIMAL(12,2) NOT NULL DEFAULT 10.00,
    "lastMovementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_operations" (
    "id" UUID NOT NULL,
    "operationNumber" VARCHAR(50) NOT NULL,
    "type" "OperationType" NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'DRAFT',
    "idempotencyKey" VARCHAR(100),
    "requestedById" UUID,
    "approvedById" UUID,
    "notes" TEXT,
    "rejectionReason" VARCHAR(500),
    "metadata" JSONB,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_operation_items" (
    "id" UUID NOT NULL,
    "operationId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "sourceLocationId" UUID,
    "destinationLocationId" UUID,
    "quantity" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "reason" VARCHAR(255),
    "notes" VARCHAR(500),

    CONSTRAINT "stock_operation_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "operationId" UUID,
    "movementType" "MovementType" NOT NULL,
    "quantityChange" DECIMAL(12,2) NOT NULL,
    "quantityBefore" DECIMAL(12,2) NOT NULL,
    "quantityAfter" DECIMAL(12,2) NOT NULL,
    "referenceDoc" VARCHAR(100),
    "reason" VARCHAR(255),
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_sessions" (
    "id" UUID NOT NULL,
    "sessionNumber" VARCHAR(50) NOT NULL,
    "locationId" UUID NOT NULL,
    "status" "OperationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" UUID,
    "approvedById" UUID,
    "notes" TEXT,
    "rejectionReason" VARCHAR(500),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_count_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_count_items" (
    "id" UUID NOT NULL,
    "sessionId" UUID NOT NULL,
    "medicineId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "systemQuantity" DECIMAL(12,2) NOT NULL,
    "countedQuantity" DECIMAL(12,2) NOT NULL,
    "varianceQuantity" DECIMAL(12,2) NOT NULL,
    "notes" VARCHAR(255),

    CONSTRAINT "stock_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "medicine_categories_name_key" ON "medicine_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_categories_code_key" ON "medicine_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_name_key" ON "manufacturers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "manufacturers_code_key" ON "manufacturers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dosage_forms_name_key" ON "dosage_forms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "dosage_forms_code_key" ON "dosage_forms"("code");

-- CreateIndex
CREATE UNIQUE INDEX "administration_routes_name_key" ON "administration_routes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "administration_routes_code_key" ON "administration_routes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_name_key" ON "measurement_units"("name");

-- CreateIndex
CREATE UNIQUE INDEX "measurement_units_symbol_key" ON "measurement_units"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "compositions_name_key" ON "compositions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_compositions_medicineId_compositionId_key" ON "medicine_compositions"("medicineId", "compositionId");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_sku_key" ON "medicines"("sku");

-- CreateIndex
CREATE INDEX "medicines_brandName_idx" ON "medicines"("brandName");

-- CreateIndex
CREATE INDEX "medicines_genericName_idx" ON "medicines"("genericName");

-- CreateIndex
CREATE INDEX "medicines_sku_idx" ON "medicines"("sku");

-- CreateIndex
CREATE INDEX "medicines_categoryId_idx" ON "medicines"("categoryId");

-- CreateIndex
CREATE INDEX "medicines_manufacturerId_idx" ON "medicines"("manufacturerId");

-- CreateIndex
CREATE INDEX "medicines_isActive_idx" ON "medicines"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_barcodes_barcode_key" ON "medicine_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "medicine_barcodes_barcode_idx" ON "medicine_barcodes"("barcode");

-- CreateIndex
CREATE INDEX "medicine_barcodes_medicineId_idx" ON "medicine_barcodes"("medicineId");

-- CreateIndex
CREATE INDEX "medicine_batches_medicineId_idx" ON "medicine_batches"("medicineId");

-- CreateIndex
CREATE INDEX "medicine_batches_batchNumber_idx" ON "medicine_batches"("batchNumber");

-- CreateIndex
CREATE INDEX "medicine_batches_expiryDate_idx" ON "medicine_batches"("expiryDate");

-- CreateIndex
CREATE INDEX "medicine_batches_status_idx" ON "medicine_batches"("status");

-- CreateIndex
CREATE UNIQUE INDEX "medicine_batches_medicineId_batchNumber_key" ON "medicine_batches"("medicineId", "batchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_code_key" ON "stock_locations"("code");

-- CreateIndex
CREATE INDEX "stock_locations_code_idx" ON "stock_locations"("code");

-- CreateIndex
CREATE INDEX "stock_locations_type_idx" ON "stock_locations"("type");

-- CreateIndex
CREATE INDEX "stock_balances_medicineId_idx" ON "stock_balances"("medicineId");

-- CreateIndex
CREATE INDEX "stock_balances_batchId_idx" ON "stock_balances"("batchId");

-- CreateIndex
CREATE INDEX "stock_balances_locationId_idx" ON "stock_balances"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_balances_batchId_locationId_key" ON "stock_balances"("batchId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "stock_operations_operationNumber_key" ON "stock_operations"("operationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_operations_idempotencyKey_key" ON "stock_operations"("idempotencyKey");

-- CreateIndex
CREATE INDEX "stock_operations_operationNumber_idx" ON "stock_operations"("operationNumber");

-- CreateIndex
CREATE INDEX "stock_operations_type_idx" ON "stock_operations"("type");

-- CreateIndex
CREATE INDEX "stock_operations_status_idx" ON "stock_operations"("status");

-- CreateIndex
CREATE INDEX "stock_operations_createdAt_idx" ON "stock_operations"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "stock_operation_items_operationId_idx" ON "stock_operation_items"("operationId");

-- CreateIndex
CREATE INDEX "stock_operation_items_batchId_idx" ON "stock_operation_items"("batchId");

-- CreateIndex
CREATE INDEX "stock_movements_batchId_idx" ON "stock_movements"("batchId");

-- CreateIndex
CREATE INDEX "stock_movements_locationId_idx" ON "stock_movements"("locationId");

-- CreateIndex
CREATE INDEX "stock_movements_operationId_idx" ON "stock_movements"("operationId");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- CreateIndex
CREATE INDEX "stock_movements_createdAt_idx" ON "stock_movements"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "stock_count_sessions_sessionNumber_key" ON "stock_count_sessions"("sessionNumber");

-- CreateIndex
CREATE INDEX "stock_count_sessions_sessionNumber_idx" ON "stock_count_sessions"("sessionNumber");

-- CreateIndex
CREATE INDEX "stock_count_sessions_locationId_idx" ON "stock_count_sessions"("locationId");

-- CreateIndex
CREATE INDEX "stock_count_sessions_status_idx" ON "stock_count_sessions"("status");

-- CreateIndex
CREATE INDEX "stock_count_items_sessionId_idx" ON "stock_count_items"("sessionId");

-- CreateIndex
CREATE INDEX "stock_count_items_batchId_idx" ON "stock_count_items"("batchId");

-- AddForeignKey
ALTER TABLE "medicine_compositions" ADD CONSTRAINT "medicine_compositions_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_compositions" ADD CONSTRAINT "medicine_compositions_compositionId_fkey" FOREIGN KEY ("compositionId") REFERENCES "compositions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_compositions" ADD CONSTRAINT "medicine_compositions_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "measurement_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "medicine_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "manufacturers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_dosageFormId_fkey" FOREIGN KEY ("dosageFormId") REFERENCES "dosage_forms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_administrationRouteId_fkey" FOREIGN KEY ("administrationRouteId") REFERENCES "administration_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicines" ADD CONSTRAINT "medicines_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_barcodes" ADD CONSTRAINT "medicine_barcodes_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medicine_batches" ADD CONSTRAINT "medicine_batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_locations" ADD CONSTRAINT "stock_locations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operations" ADD CONSTRAINT "stock_operations_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operations" ADD CONSTRAINT "stock_operations_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operation_items" ADD CONSTRAINT "stock_operation_items_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "stock_operations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operation_items" ADD CONSTRAINT "stock_operation_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operation_items" ADD CONSTRAINT "stock_operation_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operation_items" ADD CONSTRAINT "stock_operation_items_sourceLocationId_fkey" FOREIGN KEY ("sourceLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_operation_items" ADD CONSTRAINT "stock_operation_items_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "stock_operations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_sessions" ADD CONSTRAINT "stock_count_sessions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "stock_count_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_medicineId_fkey" FOREIGN KEY ("medicineId") REFERENCES "medicines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_count_items" ADD CONSTRAINT "stock_count_items_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "medicine_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
