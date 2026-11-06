import 'dotenv/config';
import { PrismaClient, RoleName } from '@prisma/client';
import { ROLE_PERMISSIONS, PermissionKey } from '@medstore/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed permissions
  const permissionData = Object.entries(PermissionKey).map(([, key]) => ({
    key,
    description: `Permission: ${key}`,
  }));

  for (const perm of permissionData) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: {},
      create: perm,
    });
  }
  console.log(`✔ Seeded ${permissionData.length} permissions`);

  // Seed roles
  const roles: { name: RoleName; description: string }[] = [
    { name: 'OWNER', description: 'Store owner with full access' },
    { name: 'PHARMACIST', description: 'Licensed pharmacist' },
    { name: 'BILLING_STAFF', description: 'Billing and POS staff' },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { name: roleData.name },
      update: {},
      create: roleData,
    });
  }
  console.log(`✔ Seeded ${roles.length} roles`);

  // Assign permissions to roles
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.findUnique({
      where: { name: roleName as RoleName },
    });
    if (!role) continue;

    for (const permKey of permKeys) {
      const permission = await prisma.permission.findUnique({
        where: { key: permKey },
      });
      if (!permission) continue;

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
    console.log(`✔ Assigned permissions to ${roleName}`);
  }

  console.log('✅ Database seeded successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
