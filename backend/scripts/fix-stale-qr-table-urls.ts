import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    // If qrCode exists, parse and verify it's the expected menu path
    let parsed: URL | null = null;
    try {
      parsed = new URL(record.qrCode);
    } catch {
      // Non-URL stored — skip (do not overwrite custom values)
      continue;
    }

    // If pathname matches expected menu path but origin differs -> update
    if (parsed.pathname === expectedPath && parsed.origin !== targetUrl) {
      await prisma.restaurantTable.update({
        where: { id: record.id },
        data: { qrCode: expectedFull },
      });
      updatedCount += 1;
      console.log(`Repaired qrCode for table ${record.id} to ${expectedFull}`);
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
  });
