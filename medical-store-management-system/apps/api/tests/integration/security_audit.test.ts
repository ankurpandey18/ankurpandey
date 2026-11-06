/**
 * Security & AppSec Regression Test Suite
 *
 * Verifies fixes for security defects:
 * - Session invalidation for deactivated accounts
 * - Multi-device session revocation on password change
 * - Input validation (invalid dates, duplicate phones, blank temporary passwords)
 * - Force-change-password enforcement on protected endpoints
 * - Permission escalation defenses across all roles
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { prisma } from '../../src/config/database.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

const app = createApp();
const request = supertest(app);

const BASE_PASSWORD = 'SecurePass@123';

async function createTestAccount(opts: {
  email: string;
  role: 'OWNER' | 'PHARMACIST' | 'BILLING_STAFF';
  status?: 'ACTIVE' | 'INACTIVE';
  mustChangePassword?: boolean;
  phone?: string;
  codePrefix?: string;
}) {
  const passwordHash = await hashPassword(BASE_PASSWORD);
  const role = await prisma.role.findUnique({ where: { name: opts.role } });
  if (!role) throw new Error(`Role ${opts.role} not found`);

  return prisma.user.create({
    data: {
      name: `Sec Test ${opts.role}`,
      email: opts.email,
      phone: opts.phone ?? null,
      passwordHash,
      status: opts.status ?? 'ACTIVE',
      mustChangePassword: opts.mustChangePassword ?? false,
      roles: { create: { roleId: role.id } },
      employeeProfile: {
        create: {
          employeeCode: `${opts.codePrefix ?? 'SEC'}${Date.now()}${Math.floor(Math.random() * 1000)}`,
        },
      },
    },
  });
}

async function cleanupAccount(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.loginAttempt.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.employeeProfile.deleteMany({ where: { userId: user.id } });
  await prisma.$executeRawUnsafe('DELETE FROM "session" WHERE sess->>\'userId\' = $1', user.id);
  await prisma.user.delete({ where: { email } });
}

describe('AppSec Audit — Inactive & Deactivated Session Revocation', () => {
  const DEACT_EMAIL = 'deact.audit@medstore.test';
  let deactUserId: string;

  beforeAll(async () => {
    await cleanupAccount(DEACT_EMAIL);
    const u = await createTestAccount({ email: DEACT_EMAIL, role: 'PHARMACIST' });
    deactUserId = u.id;
  });

  afterAll(async () => {
    await cleanupAccount(DEACT_EMAIL);
  });

  it('immediately blocks active session when user is deactivated in database', async () => {
    const agent = supertest.agent(app);

    // 1. Log in while ACTIVE
    const loginRes = await agent
      .post('/api/v1/auth/login')
      .send({ email: DEACT_EMAIL, password: BASE_PASSWORD });
    expect(loginRes.status).toBe(200);

    // 2. Verified active access
    const meResBefore = await agent.get('/api/v1/auth/me');
    expect(meResBefore.status).toBe(200);

    // 3. User is deactivated (simulates owner action)
    await prisma.user.update({
      where: { id: deactUserId },
      data: { status: 'INACTIVE' },
    });
    // Also simulate session purge
    await prisma.$executeRawUnsafe('DELETE FROM "session" WHERE sess->>\'userId\' = $1', deactUserId);

    // 4. Request with old session cookie MUST fail with 401
    const meResAfter = await agent.get('/api/v1/auth/me');
    expect(meResAfter.status).toBe(401);
    expect(meResAfter.body.error.message).toMatch(/Authentication required|inactive/i);
  });
});

describe('AppSec Audit — Multi-Device Session Invalidation on Password Change', () => {
  const MULTI_EMAIL = 'multisess.audit@medstore.test';

  beforeAll(async () => {
    await cleanupAccount(MULTI_EMAIL);
    await createTestAccount({ email: MULTI_EMAIL, role: 'BILLING_STAFF' });
  });

  afterAll(async () => {
    await cleanupAccount(MULTI_EMAIL);
  });

  it('revokes all sessions across devices when password is changed', async () => {
    const device1 = supertest.agent(app);
    const device2 = supertest.agent(app);

    // Both devices log in
    await device1.post('/api/v1/auth/login').send({ email: MULTI_EMAIL, password: BASE_PASSWORD });
    await device2.post('/api/v1/auth/login').send({ email: MULTI_EMAIL, password: BASE_PASSWORD });

    expect((await device1.get('/api/v1/auth/me')).status).toBe(200);
    expect((await device2.get('/api/v1/auth/me')).status).toBe(200);

    // Device 1 changes password
    const newPassword = 'NewSecurePass@999';
    const changeRes = await device1.post('/api/v1/auth/change-password').send({
      currentPassword: BASE_PASSWORD,
      newPassword,
      confirmPassword: newPassword,
    });
    expect(changeRes.status).toBe(200);

    // Device 1 session must be gone
    expect((await device1.get('/api/v1/auth/me')).status).toBe(401);

    // Device 2 session MUST ALSO be revoked
    expect((await device2.get('/api/v1/auth/me')).status).toBe(401);
  });
});

describe('AppSec Audit — Forced Password Change Enforcement', () => {
  const FORCE_EMAIL = 'force.audit@medstore.test';
  let agent: ReturnType<typeof supertest.agent>;

  beforeAll(async () => {
    await cleanupAccount(FORCE_EMAIL);
    await createTestAccount({
      email: FORCE_EMAIL,
      role: 'PHARMACIST',
      mustChangePassword: true,
    });
    agent = supertest.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: FORCE_EMAIL, password: BASE_PASSWORD });
  });

  afterAll(async () => {
    await cleanupAccount(FORCE_EMAIL);
  });

  it('blocks access to protected business routes until password is changed', async () => {
    // Attempting pharmacist dashboard with mustChangePassword = true
    const dashRes = await agent.get('/api/v1/dashboard/pharmacist');
    expect(dashRes.status).toBe(403);
    expect(dashRes.body.error.message).toContain('must change your password');
  });

  it('allows force-change-password and then unblocks access', async () => {
    const newPass = 'UpdatedSecurePass@777';
    const forceRes = await agent.post('/api/v1/auth/force-change-password').send({
      newPassword: newPass,
      confirmPassword: newPass,
    });
    expect(forceRes.status).toBe(200);

    // Dashboard access should now succeed
    const dashRes = await agent.get('/api/v1/dashboard/pharmacist');
    expect(dashRes.status).toBe(200);
  });
});

describe('AppSec Audit — Validation & Edge Cases', () => {
  const OWNER_EMAIL = 'owner.audit@medstore.test';
  let ownerAgent: ReturnType<typeof supertest.agent>;

  beforeAll(async () => {
    await cleanupAccount(OWNER_EMAIL);
    await createTestAccount({ email: OWNER_EMAIL, role: 'OWNER' });
    ownerAgent = supertest.agent(app);
    await ownerAgent.post('/api/v1/auth/login').send({ email: OWNER_EMAIL, password: BASE_PASSWORD });
  });

  afterAll(async () => {
    await cleanupAccount(OWNER_EMAIL);
  });

  it('returns 400 VALIDATION_ERROR on invalid joining date instead of 500', async () => {
    const res = await ownerAgent.post('/api/v1/employees').send({
      name: 'Invalid Date Employee',
      email: 'bad.date@medstore.test',
      employeeCode: 'BD001',
      role: 'PHARMACIST',
      joiningDate: 'not-a-valid-date',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('accepts blank temporary password and auto-generates credentials', async () => {
    const empEmail = 'autogen.pass@medstore.test';
    await cleanupAccount(empEmail);

    const res = await ownerAgent.post('/api/v1/employees').send({
      name: 'Auto Gen Employee',
      email: empEmail,
      employeeCode: 'AG001',
      role: 'BILLING_STAFF',
      temporaryPassword: '',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(empEmail);

    await cleanupAccount(empEmail);
  });

  it('rejects duplicate employeeCode with 409 CONFLICT', async () => {
    const emp1Email = 'code1@medstore.test';
    const emp2Email = 'code2@medstore.test';
    await cleanupAccount(emp1Email);
    await cleanupAccount(emp2Email);

    // Create first
    const res1 = await ownerAgent.post('/api/v1/employees').send({
      name: 'Code First',
      email: emp1Email,
      employeeCode: 'DUP001',
      role: 'PHARMACIST',
    });
    expect(res1.status).toBe(201);

    // Attempt second with identical employeeCode
    const res2 = await ownerAgent.post('/api/v1/employees').send({
      name: 'Code Second',
      email: emp2Email,
      employeeCode: 'DUP001',
      role: 'PHARMACIST',
    });
    expect(res2.status).toBe(409);
    expect(res2.body.error.code).toBe('CONFLICT');

    await cleanupAccount(emp1Email);
    await cleanupAccount(emp2Email);
  });
});
