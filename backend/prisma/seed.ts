import 'dotenv/config';
import { OrderSource, PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const { options, pool } = createPrismaClientOptions();
const prisma = new PrismaClient(options);

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

async function ensureRestaurantTable(params: {
  restaurantId: number;
  tableNumber: string;
  qrCode: string;
  status?: string;
}): Promise<{ id: number; tableNumber: string; qrCode: string | null; status: string | null }> {
  const existing = await prisma.restaurantTable.findFirst({
    where: {
      restaurantId: params.restaurantId,
      tableNumber: params.tableNumber,
    },
  });

  if (existing) {
    return prisma.restaurantTable.update({
      where: { id: existing.id },
      data: {
        qrCode: params.qrCode,
        status: params.status ?? existing.status ?? 'AVAILABLE',
      },
    });
  }

  return prisma.restaurantTable.create({
    data: {
      restaurantId: params.restaurantId,
      tableNumber: params.tableNumber,
      qrCode: params.qrCode,
      status: params.status ?? 'AVAILABLE',
    },
  });
}

async function ensureCategory(params: {
  restaurantId: number;
  name: string;
  description: string;
}): Promise<{ id: number; name: string; description: string | null }> {
  const existing = await prisma.category.findFirst({
    where: {
      restaurantId: params.restaurantId,
      name: params.name,
    },
  });

  if (existing) {
    return prisma.category.update({
      where: { id: existing.id },
      data: { description: params.description },
    });
  }

  return prisma.category.create({
    data: params,
  });
}

async function ensureQrDemoMenu(): Promise<void> {
  const restaurant = await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {
      name: 'Foodyply Demo Restaurant',
      address: '12 Demo Street',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      cuisineType: 'Multi Cuisine',
      description: 'Demo restaurant for QR based dine-in ordering',
      imageUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
    create: {
      id: 1,
      name: 'Foodyply Demo Restaurant',
      address: '12 Demo Street',
      city: 'Bengaluru',
      latitude: 12.9716,
      longitude: 77.5946,
      cuisineType: 'Multi Cuisine',
      description: 'Demo restaurant for QR based dine-in ordering',
      imageUrl:
        'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80',
      isActive: true,
    },
  });

  await prisma.restaurantTable.upsert({
    where: { id: 1 },
    update: {
      restaurantId: restaurant.id,
      tableNumber: '1',
      qrCode: 'qr-foodyply-demo-table-1',
      status: 'AVAILABLE',
    },
    create: {
      id: 1,
      restaurantId: restaurant.id,
      tableNumber: '1',
      qrCode: 'qr-foodyply-demo-table-1',
      status: 'AVAILABLE',
    },
  });

  const menuByCategory = [
    {
      name: 'Starters',
      description: 'Small plates and crispy bites',
      items: [
        ['French Fries', 'Crispy golden fries with house seasoning', 129, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=800&q=80'],
        ['Crispy Corn', 'Sweet corn tossed with chilli, garlic and herbs', 149, 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=800&q=80'],
        ['Paneer Tikka', 'Smoky paneer cubes marinated with Indian spices', 229, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80'],
        ['Chicken Wings', 'Juicy wings glazed with spicy barbecue sauce', 269, 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80'],
        ['Veg Spring Roll', 'Crunchy rolls packed with seasoned vegetables', 159, 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80'],
      ],
    },
    {
      name: 'Main Course',
      description: 'Comforting plates for a full meal',
      items: [
        ['Pasta Alfredo', 'Creamy white sauce pasta with parmesan and herbs', 279, 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?auto=format&fit=crop&w=800&q=80'],
        ['Veg Biryani Bowl', 'Aromatic rice layered with vegetables and raita', 249, 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80'],
        ['Paneer Butter Masala', 'Paneer simmered in rich tomato cashew gravy', 299, 'https://images.unsplash.com/photo-1631452180775-44f758469c16?auto=format&fit=crop&w=800&q=80'],
        ['Chicken Curry Rice', 'Homestyle chicken curry served with steamed rice', 329, 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=800&q=80'],
        ['Dal Tadka Combo', 'Yellow dal, jeera rice, salad and papad', 219, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=800&q=80'],
      ],
    },
    {
      name: 'Pizza',
      description: 'Freshly baked pizzas with generous toppings',
      items: [
        ['Margherita Pizza', 'Classic tomato sauce, mozzarella and basil', 299, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=800&q=80'],
        ['Farmhouse Pizza', 'Capsicum, onion, tomato, corn and olives', 349, 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?auto=format&fit=crop&w=800&q=80'],
        ['Cheese Burst Pizza', 'Loaded cheese pizza with molten cheese crust', 399, 'https://images.unsplash.com/photo-1593504049359-74330189a345?auto=format&fit=crop&w=800&q=80'],
        ['Pepperoni Pizza', 'Cheesy pizza topped with pepperoni slices', 449, 'https://images.unsplash.com/photo-1628840042765-356cda07504e?auto=format&fit=crop&w=800&q=80'],
        ['Veggie Supreme Pizza', 'Loaded vegetable pizza with extra mozzarella', 379, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80'],
      ],
    },
    {
      name: 'Burgers',
      description: 'Stacked burgers with soft buns and house sauces',
      items: [
        ['Veg Burger', 'Crispy veg patty with lettuce and burger sauce', 179, 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80'],
        ['Chicken Burger', 'Grilled chicken patty, cheese and smoky mayo', 229, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'],
        ['Paneer Burger', 'Grilled paneer steak with mint mayo', 199, 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=800&q=80'],
        ['Cheese Burger', 'Classic cheese burger with caramelized onions', 219, 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=800&q=80'],
        ['Double Patty Burger', 'Double patty burger with cheese and pickles', 289, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=800&q=80'],
      ],
    },
    {
      name: 'Drinks',
      description: 'Refreshing coolers, shakes and coffees',
      items: [
        ['Cold Coffee', 'Chilled coffee blended with ice cream', 149, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=800&q=80'],
        ['Mojito', 'Mint, lime and soda served over crushed ice', 139, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80'],
        ['Strawberry Shake', 'Creamy strawberry milkshake with whipped cream', 169, 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'],
        ['Masala Lemon Soda', 'Sweet and salty lemon soda with masala', 99, 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?auto=format&fit=crop&w=800&q=80'],
        ['Iced Tea', 'Lemon iced tea brewed fresh and served chilled', 129, 'https://images.unsplash.com/photo-1499638673689-79a0b5115d87?auto=format&fit=crop&w=800&q=80'],
      ],
    },
    {
      name: 'Desserts',
      description: 'Sweet finishes for the table',
      items: [
        ['Brownie', 'Warm chocolate brownie with fudge drizzle', 159, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80'],
        ['Gulab Jamun', 'Soft milk dumplings soaked in saffron syrup', 119, 'https://images.unsplash.com/photo-1666190092159-3171cf0fbb12?auto=format&fit=crop&w=800&q=80'],
        ['Cheesecake', 'Creamy baked cheesecake with berry compote', 219, 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80'],
        ['Chocolate Sundae', 'Chocolate ice cream, brownie crumbs and sauce', 189, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80'],
        ['Fruit Custard', 'Seasonal fruits folded in vanilla custard', 139, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80'],
      ],
    },
  ] as const;

  for (const categorySeed of menuByCategory) {
    const category = await ensureCategory({
      restaurantId: restaurant.id,
      name: categorySeed.name,
      description: categorySeed.description,
    });

    for (const [name, description, price, imageUrl] of categorySeed.items) {
      const existing = await prisma.menuItem.findFirst({
        where: {
          restaurantId: restaurant.id,
          name,
        },
      });

      const data = {
        restaurantId: restaurant.id,
        categoryId: category.id,
        name,
        description,
        price,
        imageUrl,
        isAvailable: true,
        isBestSelling: ['Margherita Pizza', 'Veg Burger', 'Cold Coffee', 'Brownie'].includes(name),
        popularityScore: ['Margherita Pizza', 'Veg Burger', 'Cold Coffee', 'Brownie'].includes(name)
          ? 90
          : 40,
        rating: 4.6,
        preparationTime: categorySeed.name === 'Drinks' ? 6 : 18,
      };

      if (existing) {
        await prisma.menuItem.update({
          where: { id: existing.id },
          data,
        });
      } else {
        await prisma.menuItem.create({ data });
      }
    }
  }
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

  const qrTableT1 = await ensureRestaurantTable({
    restaurantId: downtownBranch.id,
    tableNumber: 'T1',
    qrCode: `qr-downtown-spice-hub-t1-${downtownBranch.id}`,
  });
  const qrTableT2 = await ensureRestaurantTable({
    restaurantId: downtownBranch.id,
    tableNumber: 'T2',
    qrCode: `qr-downtown-spice-hub-t2-${downtownBranch.id}`,
  });
  await ensureRestaurantTable({
    restaurantId: downtownBranch.id,
    tableNumber: 'T3',
    qrCode: `qr-downtown-spice-hub-t3-${downtownBranch.id}`,
  });

  const starters = await ensureCategory({
    restaurantId: downtownBranch.id,
    name: 'Starters',
    description: 'Quick bites and appetizers',
  });
  const mains = await ensureCategory({
    restaurantId: downtownBranch.id,
    name: 'Main Course',
    description: 'Signature dishes',
  });
  const beverages = await ensureCategory({
    restaurantId: downtownBranch.id,
    name: 'Beverages',
    description: 'Cold and hot drinks',
  });
  const quickMeals = await ensureCategory({
    restaurantId: riversideBranch.id,
    name: 'Quick Meals',
    description: 'Fast moving branch menu',
  });

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
      restaurantId: downtownBranch.id,
      categoryId: mains.id,
      name: 'Veg Biryani Bowl',
      description: 'Aromatic basmati rice with vegetables and raita',
      price: 219,
      preparationTime: 20,
    },
    {
      restaurantId: downtownBranch.id,
      categoryId: beverages.id,
      name: 'Masala Lemon Soda',
      description: 'Refreshing lemon soda with chat masala',
      price: 79,
      preparationTime: 4,
    },
    {
      restaurantId: riversideBranch.id,
      categoryId: quickMeals.id,
      name: 'Branch Sample Item',
      description: 'Example item for nearby branch display',
      price: 129,
      preparationTime: 10,
    },
    {
      restaurantId: riversideBranch.id,
      categoryId: quickMeals.id,
      name: 'Dummy Wrap Combo',
      description: 'Paneer wrap combo meal for demo purposes',
      price: 169,
      preparationTime: 14,
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

  await prisma.menuItem.updateMany({
    where: {
      restaurantId: downtownBranch.id,
      name: { in: ['Crispy Corn', 'Veg Biryani Bowl', 'Cold Coffee'] },
    },
    data: {
      isBestSelling: true,
      popularityScore: 48,
      rating: 4.7,
      imageUrl:
        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=70',
    },
  });

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
        tableId: qrTableT2.id,
        addressId: address.id,
        orderNumber: 'ORD-DEMO-1001',
        status: 'OUT_FOR_DELIVERY',
        source: OrderSource.WEBSITE,
        orderType: 'DELIVERY',
        totalAmount: 288,
        discountAmount: 20,
        finalAmount: 268,
        paymentStatus: 'PAID',
        paymentMethod: 'UPI',
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

  const qrDemoMenuItem = await prisma.menuItem.findFirst({
    where: {
      restaurantId: downtownBranch.id,
      name: 'Crispy Corn',
    },
  });

  if (!qrDemoMenuItem) {
    throw new Error('QR demo menu item could not be prepared for seed data');
  }

  const existingQrOrder = await prisma.order.findFirst({
    where: { orderNumber: 'ORD-QR-DEMO-1001' },
  });

  if (!existingQrOrder) {
    await prisma.order.create({
      data: {
        userId: null,
        restaurantId: downtownBranch.id,
        tableId: qrTableT1.id,
        orderNumber: 'ORD-QR-DEMO-1001',
        status: 'PENDING',
        source: OrderSource.QR_DINE_IN,
        orderType: 'DINE_IN',
        totalAmount: qrDemoMenuItem.price,
        discountAmount: 0,
        finalAmount: qrDemoMenuItem.price,
        paymentStatus: 'PENDING',
        paymentMethod: 'COD',
        items: {
          create: [
            {
              menuItemId: qrDemoMenuItem.id,
              quantity: 1,
              price: qrDemoMenuItem.price,
              totalPrice: qrDemoMenuItem.price,
            },
          ],
        },
        statusLogs: {
          create: [{ status: 'PENDING' }],
        },
      },
    });
  }

  console.warn('Seed complete');
  console.warn('Admin login: admin@example.com / password123');
  console.warn('Manager login: manager@example.com / password123');
  console.warn('Customer login: customer@example.com / password123');
  console.warn('Delivery login: delivery@example.com / password123');
  console.warn(`Admin user id: ${admin.id}`);
  console.warn(`QR test restaurant id: ${downtownBranch.id}`);
  console.warn(`QR test table id: ${qrTableT1.id} (${qrTableT1.tableNumber})`);
  console.warn(`QR test table code: ${qrTableT1.qrCode}`);
  console.warn(`QR test menu item id: ${qrDemoMenuItem.id} (${qrDemoMenuItem.name})`);

  await ensureQrDemoMenu();
  console.warn('QR demo data ready: restaurantId=1, tableId=1');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
