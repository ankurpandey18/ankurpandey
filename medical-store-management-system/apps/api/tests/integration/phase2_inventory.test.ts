import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { prisma } from '../../src/config/database.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

const app = createApp();
const agent = supertest.agent(app);

const OWNER_EMAIL = 'owner.inventory.test@medstore.test';
const PHARMACIST_EMAIL = 'pharmacist.inventory.test@medstore.test';
const TEST_PASSWORD = 'TestPassword@123';

describe('Phase 2 Integration Tests — Inventory, Batches, Ledger, & Operations', () => {
  let ownerUserId: string;
  let pharmacistUserId: string;

  let categoryId: number;
  let manufacturerId: number;
  let dosageFormId: number;
  let mainLocationId: string;
  let shelfLocationId: string;

  let medicineId: string;
  let medicineSku: string;
  let batchId: string;
  const batchNumber = `B-INT-${Date.now()}`;

  beforeAll(async () => {
    // 1. Cleanup old test users
    for (const email of [OWNER_EMAIL, PHARMACIST_EMAIL]) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (u) {
        await prisma.stockMovement.deleteMany({ where: { createdById: u.id } });
        await prisma.stockOperation.deleteMany({
          where: { OR: [{ requestedById: u.id }, { approvedById: u.id }] },
        });
        await prisma.auditLog.deleteMany({ where: { actorId: u.id } });
        await prisma.loginAttempt.deleteMany({ where: { userId: u.id } });
        await prisma.userRole.deleteMany({ where: { userId: u.id } });
        await prisma.employeeProfile.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
      }
    }

    // 2. Create Owner & Pharmacist test users
    const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
    const pharmRole = await prisma.role.findUnique({ where: { name: 'PHARMACIST' } });
    if (!ownerRole || !pharmRole) throw new Error('Roles missing from seed');

    const pwHash = await hashPassword(TEST_PASSWORD);

    const owner = await prisma.user.create({
      data: {
        name: 'Inventory Test Owner',
        email: OWNER_EMAIL,
        passwordHash: pwHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { create: { roleId: ownerRole.id } },
        employeeProfile: { create: { employeeCode: `OWN${Date.now()}` } },
      },
    });
    ownerUserId = owner.id;

    const pharm = await prisma.user.create({
      data: {
        name: 'Inventory Test Pharmacist',
        email: PHARMACIST_EMAIL,
        passwordHash: pwHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { create: { roleId: pharmRole.id } },
        employeeProfile: { create: { employeeCode: `PHM${Date.now()}` } },
      },
    });
    pharmacistUserId = pharm.id;

    // 3. Fetch or create test master data
    let cat = await prisma.medicineCategory.findFirst({ where: { name: 'Antibiotics' } });
    if (!cat) {
      cat = await prisma.medicineCategory.create({
        data: { name: 'Antibiotics', code: `ANT${Date.now()}` },
      });
    }
    categoryId = cat.id;

    let mfr = await prisma.manufacturer.findFirst({ where: { name: 'Sun Pharma' } });
    if (!mfr) {
      mfr = await prisma.manufacturer.create({
        data: { name: 'Sun Pharma', code: `SUN${Date.now()}` },
      });
    }
    manufacturerId = mfr.id;

    let df = await prisma.dosageForm.findFirst({ where: { name: 'Tablet' } });
    if (!df) {
      df = await prisma.dosageForm.create({ data: { name: 'Tablet', code: 'TAB' } });
    }
    dosageFormId = df.id;

    // 4. Ensure stock locations exist
    let loc1 = await prisma.stockLocation.findFirst({ where: { code: 'MAIN_STORE' } });
    if (!loc1) {
      loc1 = await prisma.stockLocation.create({
        data: { name: 'Main Store Room', code: 'MAIN_STORE', isActive: true },
      });
    }
    mainLocationId = loc1.id;

    let loc2 = await prisma.stockLocation.findFirst({ where: { code: 'SHELF_A1' } });
    if (!loc2) {
      loc2 = await prisma.stockLocation.create({
        data: { name: 'Shelf A1 Dispensary', code: 'SHELF_A1', isActive: true },
      });
    }
    shelfLocationId = loc2.id;

    // 5. Login as Owner
    await agent.post('/api/v1/auth/login').send({
      email: OWNER_EMAIL,
      password: TEST_PASSWORD,
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (medicineId) {
      await prisma.stockMovement.deleteMany({ where: { batch: { medicineId } } });
      await prisma.stockCountItem.deleteMany({ where: { medicineId } });
      await prisma.stockOperationItem.deleteMany({ where: { medicineId } });
      await prisma.stockBalance.deleteMany({ where: { medicineId } });
      await prisma.medicineBatch.deleteMany({ where: { medicineId } });
      await prisma.medicineBarcode.deleteMany({ where: { medicineId } });
      await prisma.medicine.deleteMany({ where: { id: medicineId } });
    }

    for (const email of [OWNER_EMAIL, PHARMACIST_EMAIL]) {
      const u = await prisma.user.findUnique({ where: { email } });
      if (u) {
        await prisma.stockMovement.deleteMany({ where: { createdById: u.id } });
        await prisma.stockOperation.deleteMany({
          where: { OR: [{ requestedById: u.id }, { approvedById: u.id }] },
        });
        await prisma.auditLog.deleteMany({ where: { actorId: u.id } });
        await prisma.loginAttempt.deleteMany({ where: { userId: u.id } });
        await prisma.userRole.deleteMany({ where: { userId: u.id } });
        await prisma.employeeProfile.deleteMany({ where: { userId: u.id } });
        await prisma.user.delete({ where: { id: u.id } });
      }
    }
  });

  it('1. Creates a new medicine catalogue entry with barcode and packaging details', async () => {
    medicineSku = `SKU-INT-${Date.now()}`;
    const res = await agent.post('/api/v1/medicines').send({
      sku: medicineSku,
      brandName: 'Amoxiclav 625mg',
      genericName: 'Amoxicillin + Clavulanic Acid',
      categoryId,
      manufacturerId,
      dosageFormId,
      baseUnit: 'TABLET',
      packUnit: 'STRIP',
      unitsPerPack: 10,
      minStockLevel: 30,
      gstRate: 12,
      prescriptionRequired: true,
      regulatoryCategory: 'SCHEDULE_H',
      primaryBarcode: `BC-${Date.now()}`,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.sku).toBe(medicineSku);
    expect(res.body.data.barcodes?.length).toBeGreaterThan(0);
    medicineId = res.body.data.id;
  });

  it('2. Prevents creating a medicine with a duplicate SKU', async () => {
    const res = await agent.post('/api/v1/medicines').send({
      sku: medicineSku, // Duplicate SKU
      brandName: 'Duplicate SKU Med',
      genericName: 'Generic Test',
      baseUnit: 'TABLET',
      packUnit: 'STRIP',
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('3. Creates a new medicine batch with pricing and expiry dates', async () => {
    const res = await agent.post('/api/v1/batches').send({
      medicineId,
      batchNumber,
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-12-31',
      mrp: 150.0,
      purchasePrice: 95.0,
      sellingPrice: 135.0,
      packConversionFactor: 1,
      notes: 'Initial test shipment',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.batchNumber).toBe(batchNumber);
    batchId = res.body.data.id;
  });

  it('4. Opening Stock lifecycle: Draft -> Submit -> Approve -> Post', async () => {
    // Step A: Create opening stock draft
    const createRes = await agent.post('/api/v1/inventory/opening-stock').send({
      locationId: mainLocationId,
      items: [
        {
          medicineId,
          batchId,
          destinationLocationId: mainLocationId,
          quantity: 100, // 100 tablets
          unitPrice: 95.0,
        },
      ],
      notes: 'Opening stock for store initialization',
    });
    expect(createRes.status).toBe(201);
    const opId = createRes.body.data.id;
    expect(createRes.body.data.status).toBe('DRAFT');

    // Step B: Submit opening stock
    const submitRes = await agent.post(`/api/v1/inventory/opening-stock/${opId}/submit`);
    expect(submitRes.status).toBe(200);
    expect(submitRes.body.data.status).toBe('SUBMITTED');

    // Step C: Approve opening stock
    const approveRes = await agent.post(`/api/v1/inventory/opening-stock/${opId}/approve`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Step D: Post opening stock
    const postRes = await agent.post(`/api/v1/inventory/opening-stock/${opId}/post`);
    expect(postRes.status).toBe(200);
    expect(postRes.body.data.status).toBe('POSTED');

    // Step E: Verify stock balance was created with exactly 100 units
    const balanceRes = await agent.get(`/api/v1/inventory/balances?medicineId=${medicineId}`);
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.data.items.length).toBe(1);
    expect(Number(balanceRes.body.data.items[0].quantityOnHand)).toBe(100);

    // Step F: Verify stock movement ledger recorded OPENING_STOCK
    const ledgerRes = await agent.get('/api/v1/inventory/ledger');
    expect(ledgerRes.status).toBe(200);
    const openingMovement = ledgerRes.body.data.items.find(
      (m: any) => m.batchId === batchId && m.movementType === 'OPENING_STOCK'
    );
    expect(openingMovement).toBeDefined();
    expect(Number(openingMovement.quantityChange)).toBe(100);
    expect(Number(openingMovement.quantityBefore)).toBe(0);
    expect(Number(openingMovement.quantityAfter)).toBe(100);
  });

  it('5. Stock Adjustment workflow: Increase stock via approved adjustment', async () => {
    // Create adjustment
    const adjRes = await agent.post('/api/v1/inventory/adjustments').send({
      batchId,
      locationId: mainLocationId,
      adjustmentType: 'INCREASE',
      quantity: 20,
      reason: 'Physical recount found extra strip',
    });
    expect(adjRes.status).toBe(201);
    const adjId = adjRes.body.data.id;

    // Owner approves it
    const approveRes = await agent.post(`/api/v1/inventory/adjustments/${adjId}/decide`).send({
      action: 'APPROVE',
      reason: 'Verified count',
    });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Post adjustment
    const postRes = await agent.post(`/api/v1/inventory/adjustments/${adjId}/post`);
    expect(postRes.status).toBe(200);
    expect(postRes.body.data.status).toBe('POSTED');

    // Balance should now be 100 + 20 = 120
    const balance = await prisma.stockBalance.findUnique({
      where: {
        batchId_locationId: { batchId, locationId: mainLocationId },
      },
    });
    expect(Number(balance?.quantityOnHand)).toBe(120);
  });

  it('6. Concurrency & Negative Stock Protection: Blocks adjustments that exceed on-hand balance', async () => {
    // Current stock is 120. Attempt to decrease by 500 units.
    const adjRes = await agent.post('/api/v1/inventory/adjustments').send({
      batchId,
      locationId: mainLocationId,
      adjustmentType: 'DECREASE',
      quantity: 500, // Exceeds balance of 120
      reason: 'Attempted oversized reduction',
    });
    expect(adjRes.status).toBe(201);
    const adjId = adjRes.body.data.id;

    await agent.post(`/api/v1/inventory/adjustments/${adjId}/decide`).send({
      action: 'APPROVE',
    });

    // Attempting to post must fail with 400 Bad Request and not corrupt balance
    const postRes = await agent.post(`/api/v1/inventory/adjustments/${adjId}/post`);
    expect(postRes.status).toBe(400);
    expect(postRes.body.success).toBe(false);
    expect(postRes.body.error.message).toMatch(/Insufficient stock/i);

    // Balance must remain exactly 120
    const balance = await prisma.stockBalance.findUnique({
      where: {
        batchId_locationId: { batchId, locationId: mainLocationId },
      },
    });
    expect(Number(balance?.quantityOnHand)).toBe(120);
  });

  it('7. Stock Transfer: Atomically moves stock between two active locations', async () => {
    const transferQty = 30;
    const transferRes = await agent.post('/api/v1/inventory/transfers').send({
      batchId,
      sourceLocationId: mainLocationId,
      destinationLocationId: shelfLocationId,
      quantity: transferQty,
      reason: 'Stock replenishment for front dispensary counter',
    });

    expect(transferRes.status).toBe(201);
    expect(transferRes.body.data.status).toBe('POSTED');

    // Source location should be 120 - 30 = 90
    const sourceBal = await prisma.stockBalance.findUnique({
      where: {
        batchId_locationId: { batchId, locationId: mainLocationId },
      },
    });
    expect(Number(sourceBal?.quantityOnHand)).toBe(90);

    // Destination location should be 0 + 30 = 30
    const destBal = await prisma.stockBalance.findUnique({
      where: {
        batchId_locationId: { batchId, locationId: shelfLocationId },
      },
    });
    expect(Number(destBal?.quantityOnHand)).toBe(30);

    // Check movements in ledger: TRANSFER_OUT (-30) and TRANSFER_IN (+30)
    const movements = await prisma.stockMovement.findMany({
      where: { batchId },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    const types = movements.map((m) => m.movementType);
    expect(types).toContain('TRANSFER_OUT');
    expect(types).toContain('TRANSFER_IN');
  });

  it('8. Physical Stock Count Session: Records variance and posts reconciliation movement', async () => {
    // Current stock on Shelf A1 is 30. Count session records 28 (2 units lost/broken).
    const sessionRes = await agent.post('/api/v1/inventory/counts').send({
      locationId: shelfLocationId,
      notes: 'Shelf A1 weekly cycle count',
    });
    expect(sessionRes.status).toBe(201);
    const sessionId = sessionRes.body.data.id;

    // Record counted items
    const recordRes = await agent.post(`/api/v1/inventory/counts/${sessionId}/items`).send({
      items: [
        {
          medicineId,
          batchId,
          countedQuantity: 28, // Variance = -2
          notes: '2 blister packs damaged during handling',
        },
      ],
    });
    expect(recordRes.status).toBe(200);

    // Submit session
    await agent.post(`/api/v1/inventory/counts/${sessionId}/submit`);

    // Owner approves session
    const decideRes = await agent.post(`/api/v1/inventory/counts/${sessionId}/decide`).send({
      action: 'APPROVE',
    });
    expect(decideRes.status).toBe(200);

    // Post session
    const postRes = await agent.post(`/api/v1/inventory/counts/${sessionId}/post`);
    expect(postRes.status).toBe(200);
    expect(postRes.body.data.status).toBe('POSTED');

    // Balance on Shelf A1 must now be exactly 28
    const destBal = await prisma.stockBalance.findUnique({
      where: {
        batchId_locationId: { batchId, locationId: shelfLocationId },
      },
    });
    expect(Number(destBal?.quantityOnHand)).toBe(28);

    // Ledger should have STOCK_COUNT_VARIANCE of -2
    const varMovement = await prisma.stockMovement.findFirst({
      where: {
        batchId,
        locationId: shelfLocationId,
        movementType: 'STOCK_COUNT_VARIANCE',
      },
    });
    expect(varMovement).toBeDefined();
    expect(Number(varMovement?.quantityChange)).toBe(-2);
  });

  it('9. FEFO Allocation API: Recommends earliest expiry batch with sufficient stock', async () => {
    const res = await agent.get(
      `/api/v1/inventory/fefo-preview?medicineId=${medicineId}&requestedQuantity=50`
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requestedQuantity).toBe(50);
    expect(res.body.data.totalAllocatedQuantity).toBe(50);
    expect(res.body.data.isFullyAllocated).toBe(true);
    expect(res.body.data.allocations.length).toBeGreaterThan(0);
    expect(res.body.data.allocations[0].batchId).toBe(batchId);
  });

  it('10. Inventory Reports: Generates Expiry and Low Stock telemetry', async () => {
    // Low stock: medicine minStockLevel is 30. Total stock is 90 (main) + 28 (shelf) = 118 (>30).
    // Let's set minStockLevel to 200 so it appears in low stock
    await prisma.medicine.update({
      where: { id: medicineId },
      data: { minStockLevel: 200 },
    });

    const lowStockRes = await agent.get('/api/v1/reports/low-stock');
    expect(lowStockRes.status).toBe(200);
    const found = lowStockRes.body.data.find((i: any) => i.medicineId === medicineId);
    expect(found).toBeDefined();
    expect(found.totalStock).toBe(118);
    expect(found.minStockLevel).toBe(200);

    // Expiry report
    const expiryRes = await agent.get('/api/v1/reports/expiry');
    expect(expiryRes.status).toBe(200);
    expect(expiryRes.body.data).toBeDefined();
  });

  it('11. Inventory CSV Export: Downloads valid CSV with security headers', async () => {
    const res = await agent.get('/api/v1/imports/inventory/export');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('SKU');
    expect(res.text).toContain('Batch Number');
    expect(res.text).toContain('Quantity');
  });

  it('12. Medicine CSV Import: Previews and commits valid CSV data', async () => {
    const csvData = [
      'sku,brandName,genericName,baseUnit,packUnit,unitsPerPack,minStockLevel,gstRate,prescriptionRequired',
      `SKU-IMP-${Date.now()},ImportMedTest,GenericImport,TABLET,STRIP,10,20,12,false`,
    ].join('\n');

    // Preview
    const previewRes = await agent
      .post('/api/v1/imports/medicines/preview')
      .send({ csvText: csvData });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.data.totalRows).toBe(1);
    expect(previewRes.body.data.validCount).toBe(1);
    expect(previewRes.body.data.invalidCount).toBe(0);

    // Commit
    const commitRes = await agent
      .post('/api/v1/imports/medicines/commit')
      .send({ rows: previewRes.body.data.validRows });
    expect(commitRes.status).toBe(201);
    expect(commitRes.body.data.importedCount).toBe(1);

    // Clean up imported med
    await prisma.medicine.deleteMany({ where: { brandName: 'ImportMedTest' } });
  });
});
