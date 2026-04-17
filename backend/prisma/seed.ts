import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const prismaOptions = {
  adapter: new PrismaPg(pool),
} as unknown as Prisma.PrismaClientOptions;

const prisma = new PrismaClient(prismaOptions);

async function ensureRole(name: string): Promise<{ id: number; name: string }> {
  return prisma.roleMaster.upsert({
    where: { name },
    update: {},
    create: { name },
  });
}

async function ensureUser(params: {
  name: string;
  email: string;
  phone: string;
  plainPassword: string;
  roleId: number;
}): Promise<{ id: number }> {
  const hashedPassword = await hash(params.plainPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      name: params.name,
      phone: params.phone,
      password: hashedPassword,
      isActive: true,
    },
    create: {
      name: params.name,
      email: params.email,
      phone: params.phone,
      password: hashedPassword,
    },
  });

  const roleMapping = await prisma.userRoleMapping.findFirst({
    where: {
      userId: user.id,
      roleId: params.roleId,
    },
  });

  if (!roleMapping) {
    await prisma.userRoleMapping.create({
      data: {
        userId: user.id,
        roleId: params.roleId,
      },
    });
  }

  return { id: user.id };
}

async function main(): Promise<void> {
  const legacyStaffRole = await prisma.roleMaster.findUnique({
    where: { name: 'staff' },
  });

  if (legacyStaffRole) {
    await prisma.roleMaster.update({
      where: { id: legacyStaffRole.id },
      data: { name: 'manager' },
    });
  }

  const legacyStaffUser = await prisma.user.findUnique({
    where: { email: 'staff@example.com' },
  });

  if (legacyStaffUser) {
    await prisma.user.update({
      where: { id: legacyStaffUser.id },
      data: {
        email: 'manager@example.com',
        name: 'Operations Manager',
      },
    });
  }

  const adminRole = await ensureRole('admin');
  const managerRole = await ensureRole('manager');
  const customerRole = await ensureRole('customer');
  const deliveryBoyRole = await ensureRole('delivery_boy');

  const admin = await ensureUser({
    name: 'Admin User',
    email: 'admin@example.com',
    phone: '+919900000002',
    plainPassword: 'password123',
    roleId: adminRole.id,
  });

  await ensureUser({
    name: 'Operations Manager',
    email: 'manager@example.com',
    phone: '+919900000003',
    plainPassword: 'password123',
    roleId: managerRole.id,
  });

  const customer = await ensureUser({
    name: 'John Customer',
    email: 'customer@example.com',
    phone: '+919900000001',
    plainPassword: 'password123',
    roleId: customerRole.id,
  });

  await ensureUser({
    name: 'Delivery Boy',
    email: 'delivery@example.com',
    phone: '+919900000004',
    plainPassword: 'password123',
    roleId: deliveryBoyRole.id,
  });

  const membershipTier =
    (await prisma.membershipTier.findFirst({ where: { name: 'Gold' } })) ??
    (await prisma.membershipTier.create({
      data: {
        name: 'Gold',
        features: '5% cashback, birthday offer, priority support',
      },
    }));

  const address =
    (await prisma.userAddress.findFirst({
      where: {
        userId: customer.id,
        address: '12 MG Road',
      },
    })) ??
    (await prisma.userAddress.create({
      data: {
        userId: customer.id,
        address: '12 MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        latitude: 12.9716,
        longitude: 77.5946,
        isDefault: true,
      },
    }));

  const downtownBranch =
    (await prisma.restaurant.findFirst({
      where: { name: 'Downtown Spice Hub' },
      include: { categories: true, tables: true },
    })) ??
    (await prisma.restaurant.create({
      data: {
        name: 'Downtown Spice Hub',
        address: '45 Residency Road',
        city: 'Bengaluru',
        latitude: 12.9663,
        longitude: 77.6012,
        tables: {
          create: [
            { tableNumber: 'T1', qrCode: 'qr-table-t1', status: 'AVAILABLE' },
            { tableNumber: 'T2', qrCode: 'qr-table-t2', status: 'AVAILABLE' },
          ],
        },
        categories: {
          create: [
            { name: 'Starters', description: 'Quick bites and appetizers' },
            { name: 'Main Course', description: 'Signature dishes' },
            { name: 'Beverages', description: 'Cold and hot drinks' },
          ],
        },
      },
      include: { categories: true, tables: true },
    }));

  const riversideBranch =
    (await prisma.restaurant.findFirst({
      where: { name: 'Riverside Bites' },
      include: { categories: true },
    })) ??
    (await prisma.restaurant.create({
      data: {
        name: 'Riverside Bites',
        address: '88 Indiranagar',
        city: 'Bengaluru',
        latitude: 12.9784,
        longitude: 77.6408,
        categories: {
          create: [{ name: 'Quick Meals', description: 'Fast moving branch menu' }],
        },
      },
      include: { categories: true },
    }));

  const starters = downtownBranch.categories.find(
    (category: (typeof downtownBranch.categories)[number]) => category.name === 'Starters',
  );
  const mains = downtownBranch.categories.find(
    (category: (typeof downtownBranch.categories)[number]) => category.name === 'Main Course',
  );
  const beverages = downtownBranch.categories.find(
    (category: (typeof downtownBranch.categories)[number]) => category.name === 'Beverages',
  );
  const quickMeals = riversideBranch.categories[0];

  if (!starters || !mains || !beverages || !quickMeals) {
    throw new Error('Categories could not be prepared for seed data');
  }

  const burger =
    (await prisma.menuItem.findFirst({
      where: {
        restaurantId: downtownBranch.id,
        name: 'Paneer Burger',
      },
    })) ??
    (await prisma.menuItem.create({
      data: {
        restaurantId: downtownBranch.id,
        categoryId: mains.id,
        name: 'Paneer Burger',
        description: 'Burger with grilled paneer and house sauce',
        price: 189,
        preparationTime: 18,
        variants: {
          create: [
            { name: 'Regular', price: 189 },
            { name: 'Large', price: 239 },
          ],
        },
      },
    }));

  const menuSeedData = [
    {
      restaurantId: downtownBranch.id,
      categoryId: starters.id,
      name: 'Crispy Corn',
      description: 'Sweet corn tossed with spices',
      price: 149,
      preparationTime: 12,
    },
    {
      restaurantId: downtownBranch.id,
      categoryId: beverages.id,
      name: 'Cold Coffee',
      description: 'Chilled coffee with ice cream',
      price: 99,
      preparationTime: 5,
    },
    {
      restaurantId: riversideBranch.id,
      categoryId: quickMeals.id,
      name: 'Branch Sample Item',
      description: 'Example item for nearby branch display',
      price: 129,
      preparationTime: 10,
    },
  ];

  for (const item of menuSeedData) {
    const exists = await prisma.menuItem.findFirst({
      where: {
        restaurantId: item.restaurantId,
        name: item.name,
      },
    });

    if (!exists) {
      await prisma.menuItem.create({ data: item });
    }
  }

  const membershipExists = await prisma.membership.findFirst({
    where: {
      userId: customer.id,
      tierId: membershipTier.id,
    },
  });

  if (!membershipExists) {
    await prisma.membership.create({
      data: {
        userId: customer.id,
        tierId: membershipTier.id,
        points: 120,
      },
    });
  }

  const existingOrder = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-DEMO-1001' },
  });

  if (!existingOrder) {
    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        restaurantId: downtownBranch.id,
        tableId: downtownBranch.tables[0]?.id,
        addressId: address.id,
        orderNumber: 'ORD-DEMO-1001',
        status: 'OUT_FOR_DELIVERY',
        orderType: 'DELIVERY',
        totalAmount: 288,
        discountAmount: 20,
        finalAmount: 268,
        paymentStatus: 'PAID',
        items: {
          create: [
            {
              menuItemId: burger.id,
              quantity: 1,
              price: 189,
              totalPrice: 189,
            },
          ],
        },
        statusLogs: {
          create: [{ status: 'PLACED' }, { status: 'CONFIRMED' }, { status: 'OUT_FOR_DELIVERY' }],
        },
        payments: {
          create: [
            {
              userId: customer.id,
              transactionId: 'TXN-DEMO-1001',
              amount: 268,
              status: 'SUCCESS',
              method: 'UPI',
            },
          ],
        },
      },
    });

    const deliveryAgent =
      (await prisma.deliveryAgent.findFirst({
        where: { phone: '+919900000099' },
      })) ??
      (await prisma.deliveryAgent.create({
        data: {
          name: 'Ravi Kumar',
          phone: '+919900000099',
          isAvailable: false,
        },
      }));

    const delivery = await prisma.delivery.create({
      data: {
        orderId: order.id,
        agentId: deliveryAgent.id,
        status: 'ON_THE_WAY',
      },
    });

    await prisma.deliveryTracking.createMany({
      data: [
        {
          deliveryId: delivery.id,
          latitude: 12.969,
          longitude: 77.603,
          speed: 26,
          heading: 120,
        },
        {
          deliveryId: delivery.id,
          latitude: 12.971,
          longitude: 77.599,
          speed: 22,
          heading: 135,
        },
      ],
    });

    await prisma.notification.create({
      data: {
        userId: customer.id,
        title: 'Order on the way',
        message: 'Your order is out for delivery and will arrive soon.',
        isRead: false,
      },
    });
  }

  console.warn('Seed complete');
  console.warn('Admin login: admin@example.com / password123');
  console.warn('Manager login: manager@example.com / password123');
  console.warn('Customer login: customer@example.com / password123');
  console.warn('Delivery login: delivery@example.com / password123');
  console.warn(`Admin user id: ${admin.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
