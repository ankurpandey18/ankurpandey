import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { prisma } from '../../src/config/database.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

const app = createApp();

describe('Phase 2 Independent QA Audit & Concurrency Verification', () => {
  let ownerAgent: ReturnType<typeof supertest.agent>;
  let pharmacistAgent: ReturnType<typeof supertest.agent>;
  let billingAgent: ReturnType<typeof supertest.agent>;

  let ownerId: string;
  let pharmacistId: string;
  let billingId: string;

  let testMedId: string;
  let testMedSku: string;
  let testBatch1Id: string;
  let testBatch2Id: string;
  let expiredBatchId: string;

  let locMainId: string;
  let locShelfId: string;

  beforeAll(async () => {
    // 1. Create unique test users for each role
    const unique = Date.now().toString().slice(-6);
    const passwordHash = await hashPassword('TestSecure123!');

    // Ensure roles exist
    const ownerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'OWNER' } });
    const pharmRole = await prisma.role.findUniqueOrThrow({ where: { name: 'PHARMACIST' } });
    const billRole = await prisma.role.findUniqueOrThrow({ where: { name: 'BILLING_STAFF' } });

    // Create Owner
    const ownerUser = await prisma.user.create({
      data: {
        email: `qa_owner_${unique}@medstore.test`,
        passwordHash,
        name: 'QA Owner',
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { create: { roleId: ownerRole.id } },
        employeeProfile: { create: { employeeCode: `QO${unique}` } },
      },
    });
    ownerId = ownerUser.id;

    // Create Pharmacist
    const pharmUser = await prisma.user.create({
      data: {
        email: `qa_pharm_${unique}@medstore.test`,
        passwordHash,
        name: 'QA Pharmacist',
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { create: { roleId: pharmRole.id } },
        employeeProfile: { create: { employeeCode: `QP${unique}` } },
      },
    });
    pharmacistId = pharmUser.id;

    // Create Billing Staff
    const billUser = await prisma.user.create({
      data: {
        email: `qa_bill_${unique}@medstore.test`,
        passwordHash,
        name: 'QA Billing',
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: { create: { roleId: billRole.id } },
        employeeProfile: { create: { employeeCode: `QB${unique}` } },
      },
    });
    billingId = billUser.id;

    // Establish agent sessions
    ownerAgent = supertest.agent(app);
    await ownerAgent.post('/api/v1/auth/login').send({
      email: ownerUser.email,
      password: 'TestSecure123!',
    });

    pharmacistAgent = supertest.agent(app);
    await pharmacistAgent.post('/api/v1/auth/login').send({
      email: pharmUser.email,
      password: 'TestSecure123!',
    });

    billingAgent = supertest.agent(app);
    await billingAgent.post('/api/v1/auth/login').send({
      email: billUser.email,
      password: 'TestSecure123!',
    });

    // Fetch locations
    const mainLoc = await prisma.stockLocation.findFirstOrThrow({ where: { type: 'MAIN_STORE' } });
    const shelfLoc = await prisma.stockLocation.findFirstOrThrow({ where: { type: 'RACK' } });
    locMainId = mainLoc.id;
    locShelfId = shelfLoc.id;

    // Create test medicine
    testMedSku = `QA-MED-${unique}`;
    const medRes = await ownerAgent.post('/api/v1/medicines').send({
      sku: testMedSku,
      brandName: 'QA Test Ampoule',
      genericName: 'QA Molecule 500mg',
      baseUnit: 'VIAL',
      packUnit: 'BOX',
      unitsPerPack: 10,
      minStockLevel: 25,
      prescriptionRequired: true,
      regulatoryCategory: 'SCHEDULE_H',
    });
    testMedId = medRes.body.data.id;
  });

  afterAll(async () => {
    // Cleanup created data
    if (testMedId) {
      await prisma.stockMovement.deleteMany({ where: { batch: { medicineId: testMedId } } });
      await prisma.stockOperationItem.deleteMany({ where: { medicineId: testMedId } });
      await prisma.stockCountItem.deleteMany({ where: { medicineId: testMedId } });
      await prisma.stockBalance.deleteMany({ where: { medicineId: testMedId } });
      await prisma.medicineBarcode.deleteMany({ where: { medicineId: testMedId } });
      await prisma.medicineComposition.deleteMany({ where: { medicineId: testMedId } });
      await prisma.medicineBatch.deleteMany({ where: { medicineId: testMedId } });
      await prisma.medicine.deleteMany({ where: { id: testMedId } });
    }

    if (ownerId) {
      await prisma.userRole.deleteMany({ where: { userId: { in: [ownerId, pharmacistId, billingId] } } });
      await prisma.loginAttempt.deleteMany({ where: { userId: { in: [ownerId, pharmacistId, billingId] } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: [ownerId, pharmacistId, billingId] } } });
      await prisma.employeeProfile.deleteMany({ where: { userId: { in: [ownerId, pharmacistId, billingId] } } });
      await prisma.user.deleteMany({ where: { id: { in: [ownerId, pharmacistId, billingId] } } });
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 1: Date boundaries & Expired batch handling
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-01: Blocks batch creation when manufacturingDate is after expiryDate', async () => {
    const res = await ownerAgent.post('/api/v1/batches').send({
      medicineId: testMedId,
      batchNumber: 'INV-DATE-001',
      manufacturingDate: '2028-06-01',
      expiryDate: '2027-01-01', // Mfg date after expiry
      mrp: 100,
      purchasePrice: 60,
      sellingPrice: 90,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('QA-02: Creates active batches and an expired batch for boundary testing', async () => {
    // Batch 1: Expiring in 6 months (50 units)
    const b1 = await ownerAgent.post('/api/v1/batches').send({
      medicineId: testMedId,
      batchNumber: 'B-SOON-01',
      manufacturingDate: '2026-01-01',
      expiryDate: '2027-06-30',
      mrp: 120,
      purchasePrice: 70,
      sellingPrice: 100,
    });
    expect(b1.status).toBe(201);
    testBatch1Id = b1.body.data.id;

    // Batch 2: Expiring in 18 months (100 units)
    const b2 = await ownerAgent.post('/api/v1/batches').send({
      medicineId: testMedId,
      batchNumber: 'B-LATER-02',
      manufacturingDate: '2026-01-01',
      expiryDate: '2028-06-30',
      mrp: 120,
      purchasePrice: 70,
      sellingPrice: 100,
    });
    expect(b2.status).toBe(201);
    testBatch2Id = b2.body.data.id;

    // Batch 3: Already expired
    const b3 = await ownerAgent.post('/api/v1/batches').send({
      medicineId: testMedId,
      batchNumber: 'B-EXPIRED-03',
      manufacturingDate: '2024-01-01',
      expiryDate: '2025-01-01',
      mrp: 120,
      purchasePrice: 70,
      sellingPrice: 100,
    });
    expect(b3.status).toBe(201);
    expiredBatchId = b3.body.data.id;
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 2: Opening Stock, Balances, & FEFO Allocation Engine
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-03: Posts opening stock for batches and initializes stock balances', async () => {
    const opRes = await ownerAgent.post('/api/v1/inventory/opening-stock').send({
      locationId: locMainId,
      items: [
        {
          medicineId: testMedId,
          batchId: testBatch1Id,
          destinationLocationId: locMainId,
          quantity: 50,
          unitPrice: 70,
        },
        {
          medicineId: testMedId,
          batchId: testBatch2Id,
          destinationLocationId: locMainId,
          quantity: 100,
          unitPrice: 70,
        },
        {
          medicineId: testMedId,
          batchId: expiredBatchId,
          destinationLocationId: locMainId,
          quantity: 20,
          unitPrice: 70,
        },
      ],
    });
    expect(opRes.status).toBe(201);
    const opId = opRes.body.data.id;

    await ownerAgent.post(`/api/v1/inventory/opening-stock/${opId}/submit`);
    await ownerAgent.post(`/api/v1/inventory/opening-stock/${opId}/approve`);
    const postRes = await ownerAgent.post(`/api/v1/inventory/opening-stock/${opId}/post`);
    expect(postRes.status).toBe(200);

    // Verify stock balance in DB
    const bal1 = await prisma.stockBalance.findUnique({
      where: { batchId_locationId: { batchId: testBatch1Id, locationId: locMainId } },
    });
    expect(Number(bal1?.quantityOnHand)).toBe(50);
  });

  it('QA-04: FEFO Engine strictly excludes expired batch and allocates earliest batch first', async () => {
    // Request 80 units: Should take 50 units from B-SOON-01 and 30 units from B-LATER-02
    // B-EXPIRED-03 (20 units) must be completely excluded!
    const fefoRes = await ownerAgent.get(`/api/v1/inventory/fefo-preview?medicineId=${testMedId}&quantity=80`);
    expect(fefoRes.status).toBe(200);

    const data = fefoRes.body.data;
    expect(data.isFullyAllocated).toBe(true);
    expect(data.totalAllocatedQuantity).toBe(80);
    expect(data.shortageQuantity).toBe(0);

    // Assert allocations order and split
    expect(data.allocations.length).toBe(2);
    expect(data.allocations[0].batchNumber).toBe('B-SOON-01');
    expect(data.allocations[0].allocatedQuantity).toBe(50);
    expect(data.allocations[1].batchNumber).toBe('B-LATER-02');
    expect(data.allocations[1].allocatedQuantity).toBe(30);

    // Confirm expired batch is NEVER in allocations
    const hasExpired = data.allocations.some((a: any) => a.batchId === expiredBatchId);
    expect(hasExpired).toBe(false);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 3: Transfers (Source !== Destination validation & atomicity)
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-05: Blocks transfer when source and destination locations are identical', async () => {
    const res = await ownerAgent.post('/api/v1/inventory/transfers').send({
      batchId: testBatch1Id,
      sourceLocationId: locMainId,
      destinationLocationId: locMainId, // Identical location
      quantity: 10,
      reason: 'Erroneous same-location transfer',
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('QA-06: Atomically transfers stock between two distinct active locations', async () => {
    const res = await ownerAgent.post('/api/v1/inventory/transfers').send({
      batchId: testBatch1Id,
      sourceLocationId: locMainId,
      destinationLocationId: locShelfId,
      quantity: 15,
      reason: 'Dispensary replenishment',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('POSTED');

    const srcBal = await prisma.stockBalance.findUnique({
      where: { batchId_locationId: { batchId: testBatch1Id, locationId: locMainId } },
    });
    const destBal = await prisma.stockBalance.findUnique({
      where: { batchId_locationId: { batchId: testBatch1Id, locationId: locShelfId } },
    });

    // 50 - 15 = 35 in source
    expect(Number(srcBal?.quantityOnHand)).toBe(35);
    // 0 + 15 = 15 in destination
    expect(Number(destBal?.quantityOnHand)).toBe(15);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 4: Role-Based Separation of Duties & Tamper Resistance
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-07: Pharmacist cannot approve their own submitted stock adjustment', async () => {
    // Pharmacist submits an adjustment
    const adjRes = await pharmacistAgent.post('/api/v1/inventory/adjustments').send({
      batchId: testBatch1Id,
      locationId: locShelfId,
      adjustmentType: 'DAMAGE',
      quantity: 5,
      reason: 'Damaged ampoule in dispensing',
    });
    expect(adjRes.status).toBe(201);
    const adjId = adjRes.body.data.id;

    // Pharmacist attempts to approve their own adjustment
    const approveAttempt = await pharmacistAgent.post(`/api/v1/inventory/adjustments/${adjId}/approve`);
    // Should be rejected with 403 Forbidden
    expect(approveAttempt.status).toBe(403);

    // Owner reviews and approves it
    const ownerApprove = await ownerAgent.post(`/api/v1/inventory/adjustments/${adjId}/approve`);
    expect(ownerApprove.status).toBe(200);

    // Owner posts the adjustment
    const postRes = await ownerAgent.post(`/api/v1/inventory/adjustments/${adjId}/post`);
    expect(postRes.status).toBe(200);

    // Balance in shelf was 15, minus 5 damaged = 10
    const shelfBal = await prisma.stockBalance.findUnique({
      where: { batchId_locationId: { batchId: testBatch1Id, locationId: locShelfId } },
    });
    expect(Number(shelfBal?.quantityOnHand)).toBe(10);
  });

  it('QA-08: Billing Staff is blocked from all inventory mutations (403 Forbidden)', async () => {
    // Attempt to create medicine
    const medAttempt = await billingAgent.post('/api/v1/medicines').send({
      sku: 'HACK-SKU-999',
      brandName: 'Unauthorized Med',
      genericName: 'Hack',
      baseUnit: 'TABLET',
      packUnit: 'STRIP',
    });
    expect(medAttempt.status).toBe(403);

    // Attempt to submit adjustment
    const adjAttempt = await billingAgent.post('/api/v1/inventory/adjustments').send({
      batchId: testBatch1Id,
      locationId: locMainId,
      adjustmentType: 'INCREASE',
      quantity: 100,
      reason: 'Unauthorized stock injection',
    });
    expect(adjAttempt.status).toBe(403);

    // Attempt to transfer
    const trfAttempt = await billingAgent.post('/api/v1/inventory/transfers').send({
      batchId: testBatch1Id,
      sourceLocationId: locMainId,
      destinationLocationId: locShelfId,
      quantity: 5,
    });
    expect(trfAttempt.status).toBe(403);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 5: Concurrency, Race Condition, & Negative Stock Stress Test
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-09: Simultaneous concurrent reductions serialize cleanly and NEVER create negative stock', async () => {
    // Current stock of testBatch1Id in locShelfId is exactly 10 units.
    // We create TWO separate approved adjustments of 8 units each (Total attempted: 16 units).
    // Because 16 > 10, executing them concurrently MUST allow exactly ONE to succeed,
    // and the other MUST fail with 400 Bad Request (Insufficient stock).
    // The final balance must be exactly 10 - 8 = 2 units, NEVER negative!

    const adj1Res = await ownerAgent.post('/api/v1/inventory/adjustments').send({
      batchId: testBatch1Id,
      locationId: locShelfId,
      adjustmentType: 'DECREASE',
      quantity: 8,
      reason: 'Concurrent reduction request A',
    });
    const adj1Id = adj1Res.body.data.id;
    await ownerAgent.post(`/api/v1/inventory/adjustments/${adj1Id}/approve`);

    const adj2Res = await ownerAgent.post('/api/v1/inventory/adjustments').send({
      batchId: testBatch1Id,
      locationId: locShelfId,
      adjustmentType: 'DECREASE',
      quantity: 8,
      reason: 'Concurrent reduction request B',
    });
    const adj2Id = adj2Res.body.data.id;
    await ownerAgent.post(`/api/v1/inventory/adjustments/${adj2Id}/approve`);

    // Execute both post operations SIMULTANEOUSLY via Promise.all
    const [result1, result2] = await Promise.all([
      ownerAgent.post(`/api/v1/inventory/adjustments/${adj1Id}/post`),
      ownerAgent.post(`/api/v1/inventory/adjustments/${adj2Id}/post`),
    ]);

    const statuses = [result1.status, result2.status].sort();
    // Exactly one 200 OK and one 400 Bad Request
    expect(statuses).toEqual([200, 400]);

    // Check on-hand balance: Must be exactly 2
    const finalShelfBal = await prisma.stockBalance.findUnique({
      where: { batchId_locationId: { batchId: testBatch1Id, locationId: locShelfId } },
    });
    expect(Number(finalShelfBal?.quantityOnHand)).toBe(2);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 6: Stock Reconciliation & Double-Entry Integrity
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-10: Automated stock reconciliation reports 100% consistency across all batches', async () => {
    const reconRes = await ownerAgent.get(`/api/v1/inventory/reconciliation?medicineId=${testMedId}`);
    expect(reconRes.status).toBe(200);

    const report = reconRes.body.data;
    expect(report.totalAudited).toBeGreaterThan(0);
    // Zero discrepancies allowed
    expect(report.discrepancyCount).toBe(0);
    expect(report.consistentCount).toBe(report.totalAudited);

    // Verify all items are marked consistent
    for (const item of report.items) {
      expect(item.isConsistent).toBe(true);
      expect(item.discrepancy).toBe(0);
      expect(item.cachedQuantity).toBe(item.ledgerQuantity);
    }
  });

  // ───────────────────────────────────────────────────────────────────────────
  // CHECK 7: Duplicate operation posting rejection
  // ───────────────────────────────────────────────────────────────────────────
  it('QA-11: Prevents double-posting an already posted stock operation', async () => {
    // Find an already posted operation
    const op = await prisma.stockOperation.findFirst({
      where: { status: 'POSTED', type: 'OPENING_STOCK' },
    });
    expect(op).toBeDefined();

    const doublePostRes = await ownerAgent.post(`/api/v1/inventory/opening-stock/${op!.id}/post`);
    expect(doublePostRes.status).toBe(409); // Conflict: already posted
    expect(doublePostRes.body.success).toBe(false);
  });
});
