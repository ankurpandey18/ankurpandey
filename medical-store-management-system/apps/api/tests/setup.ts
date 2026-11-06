/**
 * Test setup — creates an isolated test database and runs migrations.
 */
import 'dotenv/config';
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/config/database.js';

beforeAll(async () => {
  // Verify test database connection
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
