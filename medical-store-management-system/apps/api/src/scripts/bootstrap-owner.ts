/**
 * Owner Bootstrap CLI
 *
 * Creates the first OWNER account securely via CLI.
 * This script is NEVER exposed as an HTTP endpoint.
 *
 * Usage:
 *   npm run bootstrap:owner --workspace=apps/api
 *
 * Or directly:
 *   cd apps/api && tsx src/scripts/bootstrap-owner.ts
 */
import 'dotenv/config';
import { createInterface } from 'readline';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../modules/auth/auth.service.js';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function validatePassword(password: string): string | null {
  if (password.length < 10) return 'At least 10 characters required';
  if (!/[A-Z]/.test(password)) return 'At least one uppercase letter required';
  if (!/[a-z]/.test(password)) return 'At least one lowercase letter required';
  if (!/[0-9]/.test(password)) return 'At least one digit required';
  if (!/[^A-Za-z0-9]/.test(password)) return 'At least one special character required';
  return null;
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   Medical Store — Owner Bootstrap CLI    ║');
  console.log('╚══════════════════════════════════════════╝\n');

  // Check for existing owner
  const existingOwner = await prisma.user.findFirst({
    where: { roles: { some: { role: { name: 'OWNER' } } } },
  });

  if (existingOwner) {
    console.log('⚠️  An OWNER account already exists:');
    console.log(`   Name:  ${existingOwner.name}`);
    console.log(`   Email: ${existingOwner.email}`);
    console.log('\nTo add additional owners, use the Employee Management interface.');
    await prisma.$disconnect();
    process.exit(0);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log('Creating your first OWNER account.\n');

    // Collect name
    const envName = process.env.BOOTSTRAP_NAME;
    const name = (envName || (await prompt(rl, 'Full Name: '))).trim();
    if (name.length < 2) {
      console.error('❌ Name must be at least 2 characters');
      process.exit(1);
    }

    // Collect email
    const envEmail = process.env.BOOTSTRAP_EMAIL;
    const email = (envEmail || (await prompt(rl, 'Email: '))).trim().toLowerCase();
    if (!validateEmail(email)) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    // Check email uniqueness
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      console.error('❌ An account with this email already exists');
      process.exit(1);
    }

    // Collect phone (optional)
    const envPhone = process.env.BOOTSTRAP_PHONE;
    const phoneInput = (envPhone || (await prompt(rl, 'Mobile Number (10 digits, optional — press Enter to skip): '))).trim();
    let phone: string | null = null;
    if (phoneInput) {
      if (!validateMobile(phoneInput)) {
        console.error('❌ Invalid Indian mobile number (must be 10 digits starting with 6-9)');
        process.exit(1);
      }
      phone = phoneInput;
    }

    // Collect employee code
    const envCode = process.env.BOOTSTRAP_CODE;
    const employeeCode = (envCode || (await prompt(rl, 'Employee Code (e.g. EMP001): '))).trim().toUpperCase();
    if (employeeCode.length < 2) {
      console.error('❌ Employee code too short');
      process.exit(1);
    }

    const existingCode = await prisma.employeeProfile.findUnique({ where: { employeeCode } });
    if (existingCode) {
      console.error('❌ Employee code is already in use');
      process.exit(1);
    }

    // Collect password
    const envPassword = process.env.BOOTSTRAP_PASSWORD;
    const password = (envPassword || (await prompt(rl, 'Password (min 10 chars, upper+lower+digit+special): '))).trim();
    const passwordError = validatePassword(password);
    if (passwordError) {
      console.error(`❌ ${passwordError}`);
      process.exit(1);
    }

    const confirmPassword = (envPassword || (await prompt(rl, 'Confirm Password: '))).trim();
    if (password !== confirmPassword) {
      console.error('❌ Passwords do not match');
      process.exit(1);
    }

    console.log('\n⏳ Creating OWNER account...');

    const passwordHash = await hashPassword(password);

    // Get or create OWNER role
    const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } });
    if (!ownerRole) {
      console.error('❌ OWNER role not found. Please run: npm run db:seed');
      process.exit(1);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        status: 'ACTIVE',
        mustChangePassword: false,
        roles: {
          create: { roleId: ownerRole.id },
        },
        employeeProfile: {
          create: {
            employeeCode,
            joiningDate: new Date(),
          },
        },
      },
    });

    console.log('\n✅ OWNER account created successfully!\n');
    console.log(`   ID:            ${user.id}`);
    console.log(`   Name:          ${user.name}`);
    console.log(`   Email:         ${user.email}`);
    console.log(`   Employee Code: ${employeeCode}`);
    console.log('\nYou can now log in at the web interface.');
    console.log('Keep your credentials secure — this output is not stored anywhere.\n');
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('❌ Bootstrap failed:', err.message);
  process.exit(1);
});
