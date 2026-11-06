import 'dotenv/config';
import { PrismaClient, RoleName, LocationType } from '@prisma/client';
import { ROLE_PERMISSIONS, PermissionKey } from '@medstore/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Seed permissions
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

  // 2. Seed roles
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

  // 3. Assign permissions to roles
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

  // 4. Seed Phase 2 Master Data: Categories
  const categories = [
    { name: 'Antibiotics', code: 'ANTIBIOTIC', description: 'Antimicrobial and antibacterial medicines' },
    { name: 'Analgesics & Antipyretics', code: 'ANALGESIC', description: 'Pain relievers and fever reducers' },
    { name: 'Antacids & Gastrointestinal', code: 'GI_ANTACID', description: 'Digestive and acidity treatment' },
    { name: 'Antihistamines & Allergy', code: 'ALLERGY', description: 'Anti-allergy and antihistamine drugs' },
    { name: 'Cardiovascular & Antihypertensive', code: 'CARDIO', description: 'Blood pressure and cardiac medications' },
    { name: 'Antidiabetics', code: 'DIABETIC', description: 'Blood sugar management medications' },
    { name: 'Respiratory & Cough', code: 'RESPIRATORY', description: 'Asthma, cough syrups, bronchodilators' },
    { name: 'Dermatological', code: 'DERMA', description: 'Skin ointments, creams and topicals' },
    { name: 'Vitamins & Supplements', code: 'NUTRITION', description: 'Multivitamins, minerals, nutritional supplements' },
    { name: 'Surgical & Medical Supplies', code: 'SURGICAL', description: 'Bandages, syringes, diagnostic strips' },
  ];
  for (const cat of categories) {
    await prisma.medicineCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }
  console.log(`✔ Seeded ${categories.length} medicine categories`);

  // 5. Seed Dosage Forms
  const dosageForms = [
    { name: 'Tablet', code: 'TAB', description: 'Solid compressed oral dosage form' },
    { name: 'Capsule', code: 'CAP', description: 'Gelatin or vegetarian shell capsule' },
    { name: 'Syrup / Oral Liquid', code: 'SYR', description: 'Sweetened liquid oral formulation' },
    { name: 'Suspension', code: 'SUSP', description: 'Liquid with suspended particles' },
    { name: 'Injection', code: 'INJ', description: 'Parenteral injectable solution or vial' },
    { name: 'Ointment', code: 'OINT', description: 'Semi-solid greasy topical preparation' },
    { name: 'Cream', code: 'CRM', description: 'Semi-solid water-soluble emulsion' },
    { name: 'Eye / Ear Drops', code: 'DROPS', description: 'Sterile ophthalmic or otic solution' },
    { name: 'Inhaler / Rotacap', code: 'INH', description: 'Aerosolized respiratory inhalant' },
  ];
  for (const df of dosageForms) {
    await prisma.dosageForm.upsert({
      where: { code: df.code },
      update: {},
      create: df,
    });
  }
  console.log(`✔ Seeded ${dosageForms.length} dosage forms`);

  // 6. Seed Administration Routes
  const routes = [
    { name: 'Oral', code: 'ORAL' },
    { name: 'Topical / External', code: 'TOPICAL' },
    { name: 'Intravenous (IV)', code: 'IV' },
    { name: 'Intramuscular (IM)', code: 'IM' },
    { name: 'Ophthalmic (Eye)', code: 'OPHTHALMIC' },
    { name: 'Otic (Ear)', code: 'OTIC' },
    { name: 'Nasal', code: 'NASAL' },
    { name: 'Inhalation', code: 'INHALATION' },
  ];
  for (const route of routes) {
    await prisma.administrationRoute.upsert({
      where: { code: route.code },
      update: {},
      create: route,
    });
  }
  console.log(`✔ Seeded ${routes.length} administration routes`);

  // 7. Seed Measurement Units
  const units = [
    { name: 'Milligram', symbol: 'mg', description: 'Weight metric' },
    { name: 'Gram', symbol: 'g', description: 'Weight metric' },
    { name: 'Microgram', symbol: 'mcg', description: 'Weight metric' },
    { name: 'Milliliter', symbol: 'ml', description: 'Volume metric' },
    { name: 'International Unit', symbol: 'IU', description: 'Biological activity measure' },
    { name: 'Percent w/w', symbol: '% w/w', description: 'Concentration weight/weight' },
    { name: 'Percent w/v', symbol: '% w/v', description: 'Concentration weight/volume' },
  ];
  for (const u of units) {
    await prisma.measurementUnit.upsert({
      where: { symbol: u.symbol },
      update: {},
      create: u,
    });
  }
  console.log(`✔ Seeded ${units.length} measurement units`);

  // 8. Seed Manufacturers
  const manufacturers = [
    { name: 'Sun Pharmaceutical Industries Ltd.', code: 'SUNPHARMA', contactPerson: 'Supply Operations', email: 'orders@sunpharma.example.com', phone: '9820011223', address: 'Goregaon, Mumbai, Maharashtra' },
    { name: 'Cipla Ltd.', code: 'CIPLA', contactPerson: 'Distribution Desk', email: 'dist@cipla.example.com', phone: '9820033445', address: 'Lower Parel, Mumbai, Maharashtra' },
    { name: "Dr. Reddy's Laboratories Ltd.", code: 'DRREDDY', contactPerson: 'Institutional Sales', email: 'sales@drreddys.example.com', phone: '9848012345', address: 'Banjara Hills, Hyderabad, Telangana' },
    { name: 'Mankind Pharma Ltd.', code: 'MANKIND', contactPerson: 'Pharma Logistics', email: 'logistics@mankind.example.com', phone: '9811022334', address: 'Okhla, New Delhi' },
    { name: 'Abbott India Ltd.', code: 'ABBOTT', contactPerson: 'Regional Depot', email: 'depot@abbott.example.com', phone: '9821044556', address: 'BKC, Mumbai, Maharashtra' },
    { name: 'Torrent Pharmaceuticals Ltd.', code: 'TORRENT', contactPerson: 'Commercial Desk', email: 'orders@torrent.example.com', phone: '9825066778', address: 'Ashram Road, Ahmedabad, Gujarat' },
    { name: 'Alkem Laboratories Ltd.', code: 'ALKEM', contactPerson: 'Customer Service', email: 'service@alkem.example.com', phone: '9820055667', address: 'Senapati Bapat Marg, Mumbai, Maharashtra' },
  ];
  for (const m of manufacturers) {
    await prisma.manufacturer.upsert({
      where: { code: m.code },
      update: {},
      create: m,
    });
  }
  console.log(`✔ Seeded ${manufacturers.length} manufacturers`);

  // 9. Seed Stock Locations
  const locations = [
    { name: 'Main Pharmacy Store', code: 'LOC-MAIN', type: LocationType.MAIN_STORE, description: 'Primary store dispensing floor' },
    { name: 'Rack A - Fast Moving & Antibiotics', code: 'LOC-RACK-A', type: LocationType.RACK, description: 'Front aisle rack for antibiotics' },
    { name: 'Rack B - Analgesics & GI', code: 'LOC-RACK-B', type: LocationType.RACK, description: 'Center aisle rack' },
    { name: 'Rack C - Chronic Care & Cardiac', code: 'LOC-RACK-C', type: LocationType.RACK, description: 'Back aisle rack for BP & diabetes' },
    { name: 'Refrigerator (2°C - 8°C)', code: 'LOC-COLD-REF', type: LocationType.REFRIGERATOR, description: 'Cold storage unit for insulins and vaccines' },
    { name: 'Storage Cabinet D', code: 'LOC-CAB-D', type: LocationType.CABINET, description: 'High-value and Schedule H1 locked cabinet' },
  ];
  for (const loc of locations) {
    await prisma.stockLocation.upsert({
      where: { code: loc.code },
      update: {},
      create: loc,
    });
  }
  console.log(`✔ Seeded ${locations.length} stock locations`);

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
