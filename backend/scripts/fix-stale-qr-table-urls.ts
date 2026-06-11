import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getTargetQrFrontendUrl(): string {
  const url =
    process.env.QR_FRONTEND_URL ||
    process.env.QR_ORDERING_APP_URL ||
    process.env.WEB_APP_URL ||
    'http://localhost:5175';

  return url.replace(/\/$/, '');
}

function isValidMenuUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.pathname.startsWith('/menu/');
  } catch {
    return false;
  }
}

async function main() {
  const targetUrl = getTargetQrFrontendUrl();
  const legacyHost = 'http://localhost:5173';

  const records = await prisma.restaurantTable.findMany({
    where: {
      qrCode: {
        contains: legacyHost,
      },
    },
  });

  if (records.length === 0) {
    console.log('No stale QR table records found.');
    return;
  }

  let updatedCount = 0;

  for (const record of records) {
    const current = record.qrCode;
    if (!current) {
      continue;
    }

    if (!isValidMenuUrl(current)) {
      continue;
    }

    const parsed = new URL(current);
    const newQrCode = `${targetUrl}${parsed.pathname}`;

    await prisma.restaurantTable.update({
      where: { id: record.id },
      data: { qrCode: newQrCode },
    });

    updatedCount += 1;
    console.log(`Updated table ${record.id} qrCode to ${newQrCode}`);
  }

  console.log(`Fixed ${updatedCount} stale table record(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to fix stale QR table URLs:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
