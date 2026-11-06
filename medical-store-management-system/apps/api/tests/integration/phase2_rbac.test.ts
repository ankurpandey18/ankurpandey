import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { prisma } from '../../src/config/database.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

const app = createApp();

const OWNER_EMAIL = 'rbac.owner@medstore.test';
const PHARMACIST_EMAIL = 'rbac.pharmacist@medstore.test';
const BILLING_EMAIL = 'rbac.billing@medstore.test';
const TEST_PASSWORD = 'RbacPassword@123';

describe('Phase 2 Integration Tests — Role-Based Access Control (RBAC)', () => {
  let ownerAgent: supertest.SuperTest<supertest.Test>;
  let pharmacistAgent: supertest.SuperTest<supertest.Test>;
  let billingAgent: supertest.SuperTest<supertest.Test>;
  const unauthRequest = supertest(app);

  let ownerUserId: string;
  let pharmacistUserId: string;
  let billingUserId: string;

  let testMedicineId: string;
  let testBatchId: string;
  let testLocationId: string;

  beforeAll(async () => {
    // 1. Clean up old test users
    for (const email of [OWNER_EMAIL, PHARMACIST_EMAIL, BILLING_EMAIL]) {
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

    const pwHash = await hashPassword(TEST_PASSWORD);

    // 2. Create users with roles
    const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
    const pharmRole = await prisma.role.findUnique({ where: { name: 'PHARMACIST' } });
    const billRole = await prisma.role.findUnique({ where: { name: 'BILLING_STAFF' } });

    if (!ownerRole || !pharmRole || !billRole) {
      throw new Error('Required roles missing from database seed');
    }

    const owner = await prisma.user.create({
      data: {
        name: 'RBAC Owner',
        email: OWNER_EMAIL,
        passwordHash: pwHash,
        status: 'ACTIVE',
        roles: { create: { roleId: ownerRole.id } },
        employeeProfile: { create: { employeeCode: `O${Math.floor(Math.random() * 899999 + 100000)}` } },
      },
    });
    ownerUserId = owner.id;

    const pharm = await prisma.user.create({
      data: {
        name: 'RBAC Pharmacist',
        email: PHARMACIST_EMAIL,
        passwordHash: pwHash,
        status: 'ACTIVE',
        roles: { create: { roleId: pharmRole.id } },
        employeeProfile: { create: { employeeCode: `P${Math.floor(Math.random() * 899999 + 100000)}` } },
      },
    });
    pharmacistUserId = pharm.id;

    const bill = await prisma.user.create({
      data: {
        name: 'RBAC Billing Staff',
        email: BILLING_EMAIL,
        passwordHash: pwHash,
        status: 'ACTIVE',
        roles: { create: { roleId: billRole.id } },
        employeeProfile: { create: { employeeCode: `B${Math.floor(Math.random() * 899999 + 100000)}` } },
      },
    });
    billingUserId = bill.id;

    // 3. Establish sessions
    ownerAgent = supertest.agent(app);
    await ownerAgent.post('/api/v1/auth/login').send({ email: OWNER_EMAIL, password: TEST_PASSWORD });

    pharmacistAgent = supertest.agent(app);
    await pharmacistAgent
      .post('/api/v1/auth/login')
      .send({ email: PHARMACIST_EMAIL, password: TEST_PASSWORD });

    billingAgent = supertest.agent(app);
    await billingAgent
      .post('/api/v1/auth/login')
      .send({ email: BILLING_EMAIL, password: TEST_PASSWORD });

    // 4. Create base medicine and batch
    const loc = await prisma.stockLocation.findFirst({ where: { isActive: true } });
    testLocationId = loc!.id;

    const med = await prisma.medicine.create({
      data: {
        sku: `SKU-RBAC-${Date.now()}`,
        brandName: 'RbacTestBrand',
        genericName: 'RbacGeneric',
        displayName: 'RbacTestBrand (RbacGeneric)',
        baseUnit: 'TABLET',
        packUnit: 'STRIP',
        unitsPerPack: 10,
        minStockLevel: 20,
        gstRate: 12,
      },
    });
    testMedicineId = med.id;

    const batch = await prisma.medicineBatch.create({
      data: {
        medicineId: med.id,
        batchNumber: `B-RBAC-${Date.now()}`,
        manufacturingDate: new Date('2026-01-01'),
        expiryDate: new Date('2027-01-01'),
        mrp: 100,
        purchasePrice: 60,
        sellingPrice: 90,
      },
    });
    testBatchId = batch.id;
  });

  afterAll(async () => {
    if (testMedicineId) {
      await prisma.stockMovement.deleteMany({ where: { batch: { medicineId: testMedicineId } } });
      await prisma.stockOperationItem.deleteMany({ where: { medicineId: testMedicineId } });
      await prisma.stockBalance.deleteMany({ where: { medicineId: testMedicineId } });
      await prisma.medicineBatch.deleteMany({ where: { medicineId: testMedicineId } });
      await prisma.medicine.deleteMany({ where: { id: testMedicineId } });
    }

    for (const email of [OWNER_EMAIL, PHARMACIST_EMAIL, BILLING_EMAIL]) {
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

  describe('Unauthenticated User Protections', () => {
    it('rejects access to medicine catalogue with 401', async () => {
      const res = await unauthRequest.get('/api/v1/medicines');
      expect(res.status).toBe(401);
    });

    it('rejects access to inventory balances with 401', async () => {
      const res = await unauthRequest.get('/api/v1/inventory/balances');
      expect(res.status).toBe(401);
    });

    it('rejects creating batch with 401', async () => {
      const res = await unauthRequest.post('/api/v1/batches').send({});
      expect(res.status).toBe(401);
    });
  });

  describe('BILLING_STAFF Permissions (Read-Only Medicine/Stock & Forbidden Modifications)', () => {
    it('allows billing staff to search medicines and read catalogue', async () => {
      const res = await billingAgent.get('/api/v1/medicines');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('allows billing staff to view available stock balances', async () => {
      const res = await billingAgent.get('/api/v1/inventory/balances');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('strictly forbids billing staff from creating medicines (403 Forbidden)', async () => {
      const res = await billingAgent.post('/api/v1/medicines').send({
        sku: 'SKU-FORBID-BILLING',
        brandName: 'Forbidden Med',
        genericName: 'Forbidden Generic',
        baseUnit: 'TABLET',
        packUnit: 'STRIP',
      });
      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('strictly forbids billing staff from creating batches (403 Forbidden)', async () => {
      const res = await billingAgent.post('/api/v1/batches').send({
        medicineId: testMedicineId,
        batchNumber: 'B-FORBID-BILL',
        manufacturingDate: '2026-01-01',
        expiryDate: '2027-01-01',
        mrp: 100,
        purchasePrice: 60,
        sellingPrice: 90,
      });
      expect(res.status).toBe(403);
    });

    it('strictly forbids billing staff from creating stock adjustments (403 Forbidden)', async () => {
      const res = await billingAgent.post('/api/v1/inventory/adjustments').send({
        batchId: testBatchId,
        locationId: testLocationId,
        adjustmentType: 'INCREASE',
        quantity: 10,
        reason: 'Illegal adjustment attempt',
      });
      expect(res.status).toBe(403);
    });

    it('strictly forbids billing staff from approving stock operations (403 Forbidden)', async () => {
      const fakeOpId = '123e4567-e89b-12d3-a456-426614174000';
      const res = await billingAgent
        .post(`/api/v1/inventory/adjustments/${fakeOpId}/decide`)
        .send({ action: 'APPROVE' });
      expect(res.status).toBe(403);
    });
  });

  describe('PHARMACIST Permissions & Self-Approval Prevention', () => {
    it('allows pharmacist to create batches', async () => {
      const res = await pharmacistAgent.post('/api/v1/batches').send({
        medicineId: testMedicineId,
        batchNumber: `B-PHARM-${Date.now()}`,
        manufacturingDate: '2026-01-01',
        expiryDate: '2027-01-01',
        mrp: 120,
        purchasePrice: 80,
        sellingPrice: 110,
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('allows pharmacist to submit a stock adjustment request', async () => {
      const res = await pharmacistAgent.post('/api/v1/inventory/adjustments').send({
        batchId: testBatchId,
        locationId: testLocationId,
        adjustmentType: 'INCREASE',
        quantity: 15,
        reason: 'Pharmacist discovered unrecorded sample pack',
      });
      expect(res.status).toBe(201);
      const adjId = res.body.data.id;

      // Should be 403 Forbidden because pharmacist lacks adjustments:approve and self-approval is forbidden
      const selfApproveRes = await pharmacistAgent
        .post(`/api/v1/inventory/adjustments/${adjId}/decide`)
        .send({ action: 'APPROVE' });
      expect(selfApproveRes.status).toBe(403);

      // But OWNER can approve it
      const ownerApproveRes = await ownerAgent
        .post(`/api/v1/inventory/adjustments/${adjId}/decide`)
        .send({ action: 'APPROVE' });
      expect(ownerApproveRes.status).toBe(200);
      expect(ownerApproveRes.body.data.status).toBe('APPROVED');
    });
  });

  describe('OWNER Permissions (Full Administrative & Approval Authority)', () => {
    it('allows owner to create medicines, batches, approve and post adjustments', async () => {
      // Create medicine
      const medRes = await ownerAgent.post('/api/v1/medicines').send({
        sku: `SKU-OWN-${Date.now()}`,
        brandName: 'Owner Brand',
        genericName: 'Owner Generic',
        baseUnit: 'CAPSULE',
        packUnit: 'BOX',
        unitsPerPack: 30,
        minStockLevel: 10,
        gstRate: 18,
      });
      expect(medRes.status).toBe(201);
      const newMedId = medRes.body.data.id;

      // Deactivate medicine
      const deactRes = await ownerAgent.post(`/api/v1/medicines/${newMedId}/deactivate`);
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      // Clean up
      await prisma.medicine.delete({ where: { id: newMedId } });
    });
  });
});
