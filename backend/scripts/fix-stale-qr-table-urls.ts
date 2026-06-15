import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const { pool, options } = createPrismaClientOptions();
const prisma = new PrismaClient(options);

function getTargetQrFrontendUrl(): string {
  const url = process.env.QR_FRONTEND_URL || process.env.QR_ORDERING_APP_URL || 'http://localhost:5175';
  return url.replace(/\/$/, '');
}

async function main() {
  const targetUrl = getTargetQrFrontendUrl();

  // Find all restaurant tables; we'll selectively update only those that match the expected menu path or have no qrCode
  const records = await prisma.restaurantTable.findMany();

  if (records.length === 0) {
    console.log('No restaurant table records found.');
    return;
  }

  let updatedCount = 0;

  for (const record of records) {
    const expectedPath = `/menu/${record.restaurantId}/${record.id}`;
    const expectedFull = `${targetUrl}${expectedPath}`;

    if (!record.qrCode) {
      // No qrCode stored — set authoritative one
      await prisma.restaurantTable.update({
        where: { id: record.id },
        data: { qrCode: expectedFull },
      });
      updatedCount += 1;
      console.log(`Set qrCode for table ${record.id} to ${expectedFull}`);
      continue;
    }

    // If qrCode exists, parse and verify it's the expected menu path.
    // Replace invalid, malformed, or stale QR values with the proper QR ordering URL.
    let parsed: URL | null = null;
    try {
      parsed = new URL(record.qrCode);
    } catch {
      await prisma.restaurantTable.update({
        where: { id: record.id },
        data: { qrCode: expectedFull },
      });
      updatedCount += 1;
      console.log(`Replaced invalid qrCode for table ${record.id} with ${expectedFull}`);
      continue;
    }

    if (parsed.pathname !== expectedPath || parsed.origin !== targetUrl) {
      await prisma.restaurantTable.update({
        where: { id: record.id },
        data: { qrCode: expectedFull },
      });
      updatedCount += 1;
      console.log(`Updated qrCode for table ${record.id} to ${expectedFull}`);
    }
  }

  console.log(`Fixed ${updatedCount} stale or missing table record(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to fix stale QR table URLs:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
