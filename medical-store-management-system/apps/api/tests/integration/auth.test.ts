/**
 * Integration tests for auth routes
 * Uses real database — requires medstore_dev to be running and seeded
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../../src/server.js';
import { prisma } from '../../src/config/database.js';
import { hashPassword } from '../../src/modules/auth/auth.service.js';

const app = createApp();
const request = supertest(app);

// Helper: create a test user
async function createTestUser(opts: {
  email: string;
  password: string;
  role: 'OWNER' | 'PHARMACIST' | 'BILLING_STAFF';
  mustChangePassword?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
}) {
  const passwordHash = await hashPassword(opts.password);
  const role = await prisma.role.findUnique({ where: { name: opts.role } });
  if (!role) throw new Error(`Role ${opts.role} not found — did you seed the DB?`);

  return prisma.user.create({
    data: {
      name: 'Test User',
      email: opts.email,
      passwordHash,
      status: opts.status ?? 'ACTIVE',
      mustChangePassword: opts.mustChangePassword ?? false,
      roles: { create: { roleId: role.id } },
      employeeProfile: {
        create: {
          employeeCode: `TEST${Date.now()}`,
        },
      },
    },
  });
}

// Clean up test users after each test
async function deleteTestUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return;
  await prisma.auditLog.deleteMany({ where: { actorId: user.id } });
  await prisma.loginAttempt.deleteMany({ where: { userId: user.id } });
  await prisma.userRole.deleteMany({ where: { userId: user.id } });
  await prisma.employeeProfile.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { email } });
}

const TEST_EMAIL = 'auth.test@medstore.test';
const TEST_PASSWORD = 'SecurePass@123';

describe('POST /api/v1/auth/login', () => {
  beforeAll(async () => {
    await deleteTestUser(TEST_EMAIL);
    await createTestUser({ email: TEST_EMAIL, password: TEST_PASSWORD, role: 'OWNER' });
  });

  afterAll(async () => {
    await deleteTestUser(TEST_EMAIL);
  });

  it('returns 200 and sets session cookie on valid credentials', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(TEST_EMAIL);
    expect(res.headers['set-cookie']).toBeDefined();
    // Verify no password hash is exposed
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('returns 401 on wrong password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: TEST_EMAIL, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    // Generic error message — no information leakage
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 401 on unknown email', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@medstore.test', password: 'anypassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password');
  });

  it('returns 400 on invalid email format', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: 'not-an-email', password: 'x' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 for inactive user', async () => {
    const inactiveEmail = 'inactive.auth@medstore.test';
    await deleteTestUser(inactiveEmail);
    await createTestUser({
      email: inactiveEmail,
      password: TEST_PASSWORD,
      role: 'PHARMACIST',
      status: 'INACTIVE',
    });

    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: inactiveEmail, password: TEST_PASSWORD });

    expect(res.status).toBe(401);
    await deleteTestUser(inactiveEmail);
  });
});

describe('GET /api/v1/auth/me', () => {
  const ME_EMAIL = 'me.test@medstore.test';

  beforeAll(async () => {
    await deleteTestUser(ME_EMAIL);
    await createTestUser({ email: ME_EMAIL, password: TEST_PASSWORD, role: 'PHARMACIST' });
  });

  afterAll(async () => {
    await deleteTestUser(ME_EMAIL);
  });

  it('returns 401 without authentication', async () => {
    const res = await request.get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current user when authenticated', async () => {
    const agent = supertest.agent(app);

    await agent
      .post('/api/v1/auth/login')
      .send({ email: ME_EMAIL, password: TEST_PASSWORD });

    const res = await agent.get('/api/v1/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(ME_EMAIL);
    expect(res.body.data.role).toBe('PHARMACIST');
  });
});

describe('POST /api/v1/auth/logout', () => {
  const LOGOUT_EMAIL = 'logout.test@medstore.test';

  beforeAll(async () => {
    await deleteTestUser(LOGOUT_EMAIL);
    await createTestUser({ email: LOGOUT_EMAIL, password: TEST_PASSWORD, role: 'BILLING_STAFF' });
  });

  afterAll(async () => {
    await deleteTestUser(LOGOUT_EMAIL);
  });

  it('destroys session and returns 200', async () => {
    const agent = supertest.agent(app);

    await agent.post('/api/v1/auth/login').send({ email: LOGOUT_EMAIL, password: TEST_PASSWORD });
    const logoutRes = await agent.post('/api/v1/auth/logout');
    expect(logoutRes.status).toBe(200);

    // Session should be gone
    const meRes = await agent.get('/api/v1/auth/me');
    expect(meRes.status).toBe(401);
  });
});

describe('RBAC — Employee routes', () => {
  const PHARMACIST_EMAIL = 'pharmacist.rbac@medstore.test';
  let agent: ReturnType<typeof supertest.agent>;

  beforeAll(async () => {
    await deleteTestUser(PHARMACIST_EMAIL);
    await createTestUser({ email: PHARMACIST_EMAIL, password: TEST_PASSWORD, role: 'PHARMACIST' });
    // Login once — reuse agent (and its session cookie) for all checks
    agent = supertest.agent(app);
    await agent.post('/api/v1/auth/login').send({ email: PHARMACIST_EMAIL, password: TEST_PASSWORD });
  });

  afterAll(async () => {
    await deleteTestUser(PHARMACIST_EMAIL);
  });

  it('returns 403 when PHARMACIST accesses employee list', async () => {
    const res = await agent.get('/api/v1/employees');
    expect(res.status).toBe(403);
  });

  it('returns 403 when PHARMACIST accesses audit logs', async () => {
    const res = await agent.get('/api/v1/audit');
    expect(res.status).toBe(403);
  });

  it('returns 403 when PHARMACIST accesses owner dashboard', async () => {
    const res = await agent.get('/api/v1/dashboard/owner');
    expect(res.status).toBe(403);
  });

  it('returns 200 when PHARMACIST accesses pharmacist dashboard', async () => {
    const res = await agent.get('/api/v1/dashboard/pharmacist');
    expect(res.status).toBe(200);
  });
});
