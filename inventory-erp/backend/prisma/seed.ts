/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, RoleType } from '@prisma/client';

import { hash } from 'bcryptjs';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

const url = new URL(databaseUrl);
const schema = url.searchParams.get('schema') || 'inventory_management';

const pool = new Pool({
  connectionString: databaseUrl,
  options: `-c search_path=${schema}`,
});

const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) } as any);

// ── Permission definitions ──────────────────────────────────────────────────
// Each permission follows the pattern: module:action
const PERMISSIONS: Array<{ code: string; module: string; action: string; label: string }> = [
  // Inventory / Ingredients
  { code: 'ingredients:read', module: 'ingredients', action: 'read', label: 'View Ingredients' },
  {
    code: 'ingredients:create',
    module: 'ingredients',
    action: 'create',
    label: 'Create Ingredients',
  },
  {
    code: 'ingredients:update',
    module: 'ingredients',
    action: 'update',
    label: 'Update Ingredients',
  },
  {
    code: 'ingredients:delete',
    module: 'ingredients',
    action: 'delete',
    label: 'Delete Ingredients',
  },

  // Categories
  { code: 'categories:read', module: 'categories', action: 'read', label: 'View Categories' },
  { code: 'categories:create', module: 'categories', action: 'create', label: 'Create Categories' },
  { code: 'categories:update', module: 'categories', action: 'update', label: 'Update Categories' },
  { code: 'categories:delete', module: 'categories', action: 'delete', label: 'Delete Categories' },

  // Suppliers
  { code: 'suppliers:read', module: 'suppliers', action: 'read', label: 'View Suppliers' },
  { code: 'suppliers:create', module: 'suppliers', action: 'create', label: 'Create Suppliers' },
  { code: 'suppliers:update', module: 'suppliers', action: 'update', label: 'Update Suppliers' },
  { code: 'suppliers:delete', module: 'suppliers', action: 'delete', label: 'Delete Suppliers' },

  // Purchase Orders
  { code: 'po:read', module: 'procurement', action: 'read', label: 'View Purchase Orders' },
  { code: 'po:create', module: 'procurement', action: 'create', label: 'Create Purchase Orders' },
  {
    code: 'po:approve',
    module: 'procurement',
    action: 'approve',
    label: 'Approve Purchase Orders',
  },
  { code: 'po:cancel', module: 'procurement', action: 'cancel', label: 'Cancel Purchase Orders' },

  // Goods Receipt Notes
  { code: 'grn:read', module: 'procurement', action: 'read', label: 'View GRNs' },
  { code: 'grn:create', module: 'procurement', action: 'create', label: 'Create GRNs' },

  // Stock Movements
  { code: 'stock:read', module: 'stock', action: 'read', label: 'View Stock Levels' },
  { code: 'stock:transfer', module: 'stock', action: 'transfer', label: 'Transfer Stock' },
  { code: 'stock:adjust', module: 'stock', action: 'adjust', label: 'Adjust Stock' },

  // Requisitions
  { code: 'requisition:read', module: 'requisition', action: 'read', label: 'View Requisitions' },
  {
    code: 'requisition:create',
    module: 'requisition',
    action: 'create',
    label: 'Create Requisitions',
  },
  {
    code: 'requisition:approve',
    module: 'requisition',
    action: 'approve',
    label: 'Approve Requisitions',
  },
  {
    code: 'requisition:fulfill',
    module: 'requisition',
    action: 'fulfill',
    label: 'Fulfill Requisitions',
  },

  // Recipes
  { code: 'recipes:read', module: 'recipes', action: 'read', label: 'View Recipes' },
  { code: 'recipes:create', module: 'recipes', action: 'create', label: 'Create Recipes' },
  { code: 'recipes:update', module: 'recipes', action: 'update', label: 'Update Recipes' },
  { code: 'recipes:delete', module: 'recipes', action: 'delete', label: 'Delete Recipes' },

  // Waste
  { code: 'waste:read', module: 'waste', action: 'read', label: 'View Waste Logs' },
  { code: 'waste:create', module: 'waste', action: 'create', label: 'Log Waste' },

  // Returns
  { code: 'returns:read', module: 'returns', action: 'read', label: 'View Returns' },
  { code: 'returns:create', module: 'returns', action: 'create', label: 'Create Returns' },
  { code: 'returns:approve', module: 'returns', action: 'approve', label: 'Approve Returns' },

  // Reports
  { code: 'reports:read', module: 'reports', action: 'read', label: 'View Reports' },
  { code: 'reports:export', module: 'reports', action: 'export', label: 'Export Reports' },

  // Warehouses
  { code: 'warehouses:read', module: 'warehouses', action: 'read', label: 'View Warehouses' },
  { code: 'warehouses:create', module: 'warehouses', action: 'create', label: 'Create Warehouses' },
  { code: 'warehouses:update', module: 'warehouses', action: 'update', label: 'Update Warehouses' },

  // User Management
  { code: 'users:read', module: 'users', action: 'read', label: 'View Users' },
  { code: 'users:create', module: 'users', action: 'create', label: 'Create Users' },
  { code: 'users:update', module: 'users', action: 'update', label: 'Update Users' },
  { code: 'users:delete', module: 'users', action: 'delete', label: 'Delete Users' },

  // Settings / System
  { code: 'settings:read', module: 'settings', action: 'read', label: 'View Settings' },
  { code: 'settings:update', module: 'settings', action: 'update', label: 'Update Settings' },
];

// ── Role → Permission mappings ──────────────────────────────────────────────
// Every permission code that a role should have.
const ROLE_PERMISSIONS: Record<RoleType, string[]> = {
  [RoleType.SUPER_ADMIN]: PERMISSIONS.map((p) => p.code), // all permissions

  [RoleType.INVENTORY_MANAGER]: [
    'ingredients:read',
    'ingredients:create',
    'ingredients:update',
    'ingredients:delete',
    'categories:read',
    'categories:create',
    'categories:update',
    'categories:delete',
    'suppliers:read',
    'suppliers:create',
    'suppliers:update',
    'stock:read',
    'stock:transfer',
    'stock:adjust',
    'recipes:read',
    'recipes:create',
    'recipes:update',
    'recipes:delete',
    'waste:read',
    'waste:create',
    'returns:read',
    'returns:create',
    'returns:approve',
    'reports:read',
    'reports:export',
    'requisition:read',
    'requisition:create',
    'requisition:approve',
    'requisition:fulfill',
  ],

  [RoleType.WAREHOUSE_MANAGER]: [
    'ingredients:read',
    'categories:read',
    'suppliers:read',
    'po:read',
    'grn:read',
    'grn:create',
    'stock:read',
    'stock:transfer',
    'stock:adjust',
    'warehouses:read',
    'warehouses:create',
    'warehouses:update',
    'requisition:read',
    'requisition:fulfill',
    'returns:read',
    'returns:create',
    'reports:read',
  ],

  [RoleType.PROCUREMENT_MANAGER]: [
    'ingredients:read',
    'categories:read',
    'suppliers:read',
    'suppliers:create',
    'suppliers:update',
    'po:read',
    'po:create',
    'po:approve',
    'po:cancel',
    'grn:read',
    'grn:create',
    'stock:read',
    'reports:read',
    'reports:export',
  ],

  [RoleType.PURCHASE_OFFICER]: [
    'ingredients:read',
    'categories:read',
    'suppliers:read',
    'po:read',
    'po:create',
    'grn:read',
    'stock:read',
  ],

  [RoleType.GOODS_RECEIVING_OFFICER]: [
    'ingredients:read',
    'po:read',
    'grn:read',
    'grn:create',
    'stock:read',
    'warehouses:read',
  ],

  [RoleType.STORE_MANAGER]: [
    'ingredients:read',
    'categories:read',
    'stock:read',
    'stock:transfer',
    'requisition:read',
    'requisition:create',
    'recipes:read',
    'waste:read',
    'waste:create',
    'returns:read',
    'returns:create',
    'reports:read',
  ],

  [RoleType.AUDITOR]: [
    'ingredients:read',
    'categories:read',
    'suppliers:read',
    'po:read',
    'grn:read',
    'stock:read',
    'recipes:read',
    'waste:read',
    'returns:read',
    'reports:read',
    'reports:export',
    'users:read',
  ],
};

// ── Seed helpers ────────────────────────────────────────────────────────────

async function seedPermissions(): Promise<number> {
  let created = 0;
  for (const perm of PERMISSIONS) {
    const existing = await prisma.permission.findUnique({ where: { code: perm.code } });
    if (!existing) {
      await prisma.permission.create({ data: perm });
      created++;
    }
  }
  return created;
}

async function seedRolePermissions(): Promise<number> {
  let created = 0;
  for (const [role, permissionCodes] of Object.entries(ROLE_PERMISSIONS)) {
    for (const code of permissionCodes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (!permission) continue;

      const existing = await prisma.rolePermission.findUnique({
        where: { role_permissionId: { role: role as RoleType, permissionId: permission.id } },
      });

      if (!existing) {
        await prisma.rolePermission.create({
          data: { role: role as RoleType, permissionId: permission.id },
        });
        created++;
      }
    }
  }
  return created;
}

async function seedSuperAdmin(): Promise<{ email: string; password: string } | null> {
  const email = 'admin@inventory.com';
  const plainPassword = 'Admin@123';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return null; // already seeded
  }

  const hashedPassword = await hash(plainPassword, 10);
  await prisma.user.create({
    data: {
      email,
      name: 'Super Admin',
      password: hashedPassword,
      role: RoleType.SUPER_ADMIN,
      isActive: true,
    },
  });

  return { email, password: plainPassword };
}

// ── Master Data ───────────────────────────────────────────────────────────

async function seedMasterData(): Promise<void> {
  // Warehouse
  const wh = await prisma.warehouse.upsert({
    where: { name: 'Central Warehouse' },
    update: {},
    create: { name: 'Central Warehouse', location: 'Main Distribution Center' },
  });
  console.log(`  Warehouse   : ${wh.name}`);

  // Categories
  const categoryNames = [
    'Grains & Cereals',
    'Vegetables',
    'Spices & Herbs',
    'Dairy & Eggs',
    'Meat & Seafood',
    'Oils & Condiments',
    'Beverages',
    'Frozen Foods',
  ];
  for (const name of categoryNames) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name } });
  }
  const cats = await prisma.category.findMany();
  const catMap = Object.fromEntries(cats.map((c) => [c.name, c.id]));
  console.log(`  Categories  : ${cats.length} seeded`);

  // Brands
  const brandNames = ['Tata', 'Fortune', 'Haldiram', 'Amul', 'Britannia'];
  for (const name of brandNames) {
    await prisma.brand.upsert({ where: { name }, update: {}, create: { name } });
  }
  console.log(`  Brands      : ${brandNames.length} seeded`);

  // Ingredients
  const ingredientData = [
    {
      sku: 'ING-RICE',
      name: 'Basmati Rice',
      categoryId: catMap['Grains & Cereals'],
      unit: 'KG',
      minimumStock: 50,
      maximumStock: 500,
      reorderLevel: 100,
    },
    {
      sku: 'ING-WHEAT',
      name: 'Wheat Flour',
      categoryId: catMap['Grains & Cereals'],
      unit: 'KG',
      minimumStock: 30,
      maximumStock: 300,
      reorderLevel: 60,
    },
    {
      sku: 'ING-TOMATO',
      name: 'Fresh Tomatoes',
      categoryId: catMap['Vegetables'],
      unit: 'KG',
      minimumStock: 20,
      maximumStock: 100,
      reorderLevel: 30,
    },
    {
      sku: 'ING-ONION',
      name: 'Red Onions',
      categoryId: catMap['Vegetables'],
      unit: 'KG',
      minimumStock: 20,
      maximumStock: 100,
      reorderLevel: 30,
    },
    {
      sku: 'ING-TURM',
      name: 'Turmeric Powder',
      categoryId: catMap['Spices & Herbs'],
      unit: 'KG',
      minimumStock: 5,
      maximumStock: 50,
      reorderLevel: 10,
    },
    {
      sku: 'ING-CUMN',
      name: 'Cumin Seeds',
      categoryId: catMap['Spices & Herbs'],
      unit: 'KG',
      minimumStock: 5,
      maximumStock: 30,
      reorderLevel: 8,
    },
    {
      sku: 'ING-GHEE',
      name: 'Clarified Butter',
      categoryId: catMap['Dairy & Eggs'],
      unit: 'L',
      minimumStock: 10,
      maximumStock: 100,
      reorderLevel: 20,
    },
    {
      sku: 'ING-CHKN',
      name: 'Chicken Breast',
      categoryId: catMap['Meat & Seafood'],
      unit: 'KG',
      minimumStock: 15,
      maximumStock: 80,
      reorderLevel: 25,
    },
    {
      sku: 'ING-MUST',
      name: 'Mustard Oil',
      categoryId: catMap['Oils & Condiments'],
      unit: 'L',
      minimumStock: 10,
      maximumStock: 60,
      reorderLevel: 15,
    },
    {
      sku: 'ING-SALT',
      name: 'Table Salt',
      categoryId: catMap['Oils & Condiments'],
      unit: 'KG',
      minimumStock: 5,
      maximumStock: 50,
      reorderLevel: 10,
    },
  ];
  for (const item of ingredientData) {
    await prisma.ingredient.upsert({
      where: { sku: item.sku },
      update: {},
      create: item,
    });
  }
  const ingredients = await prisma.ingredient.findMany();
  console.log(`  Ingredients : ${ingredients.length} seeded`);

  // Suppliers
  const s1 = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-001' },
    update: {},
    create: {
      supplierCode: 'SUP-001',
      companyName: 'Fresh Produce Co.',
      contactPerson: 'Rajesh Kumar',
      mobile: '+91-9876543210',
      email: 'rajesh@freshproduce.com',
      address: 'Mumbai, Maharashtra',
      paymentTerms: 'Net 30',
      poPrefix: 'FPC',
      leadTime: 7,
    },
  });
  const s2 = await prisma.supplier.upsert({
    where: { supplierCode: 'SUP-002' },
    update: {},
    create: {
      supplierCode: 'SUP-002',
      companyName: 'Spice World Trading',
      contactPerson: 'Priya Sharma',
      mobile: '+91-9123456789',
      email: 'priya@spiceworld.com',
      address: 'Delhi, NCR',
      paymentTerms: 'Net 15',
      poPrefix: 'SWT',
      leadTime: 3,
    },
  });
  console.log(`  Suppliers   : 2 seeded`);

  // Supplier Price Agreements (sample)
  const riceIng = ingredients.find((i) => i.sku === 'ING-RICE');
  const wheatIng = ingredients.find((i) => i.sku === 'ING-WHEAT');
  const turmIng = ingredients.find((i) => i.sku === 'ING-TURM');
  if (riceIng && wheatIng && turmIng) {
    const prices = [
      { supplierId: s1.id, ingredientId: riceIng.id, price: 85 },
      { supplierId: s1.id, ingredientId: wheatIng.id, price: 45 },
      { supplierId: s1.id, ingredientId: turmIng.id, price: 320 },
      { supplierId: s2.id, ingredientId: turmIng.id, price: 290 },
      { supplierId: s2.id, ingredientId: riceIng.id, price: 90 },
    ];
    for (const p of prices) {
      await prisma.supplierIngredientPrice.upsert({
        where: {
          supplierId_ingredientId: { supplierId: p.supplierId, ingredientId: p.ingredientId },
        },
        update: { price: p.price },
        create: { ...p, effectiveDate: new Date() },
      });
    }
    console.log(`  Price Agreements : ${prices.length} seeded`);
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('Seeding Inventory ERP...\n');

  const permCount = await seedPermissions();
  console.log(`  Permissions : ${PERMISSIONS.length} defined, ${permCount} newly created`);

  const rpCount = await seedRolePermissions();
  console.log(`  Role-Perms  : ${rpCount} newly created`);

  const admin = await seedSuperAdmin();
  if (admin) {
    console.log(`  Super Admin : ${admin.email} / ${admin.password}`);
  } else {
    console.log('  Super Admin : already exists, skipped');
  }

  await seedMasterData();

  console.log('\nSeed complete.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error('Seed failed:', error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
