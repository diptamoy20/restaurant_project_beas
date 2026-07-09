import 'dotenv/config';
import { randomBytes } from 'crypto';
import { PrismaClient } from '@prisma/client';

import { createPrismaClientOptions } from '../src/prisma/prisma-client-options';

const { pool, options } = createPrismaClientOptions();
const prisma = new PrismaClient(options);

function generateSecureToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}

function getTargetQrFrontendUrl(): string {
  const url =
    process.env.QR_ORDERING_BASE_URL ||
    process.env.QR_FRONTEND_URL ||
    process.env.QR_ORDERING_APP_URL ||
    'http://localhost:5175';
  return url.replace(/\/$/, '');
}

function buildTableQrUrl(tableToken: string): string {
  return `${getTargetQrFrontendUrl()}/table/${tableToken}`;
}

function isLegacyMenuQrUrl(qrCode: string | null, restaurantId: number, tableId: number): boolean {
  if (!qrCode) {
    return true;
  }

  try {
    const parsed = new URL(qrCode);
    return parsed.pathname === `/menu/${restaurantId}/${tableId}`;
  } catch {
    return true;
  }
}

async function main() {
  const records = await prisma.restaurantTable.findMany();

  if (records.length === 0) {
    console.log('No restaurant table records found.');
    return;
  }

  let updatedCount = 0;

  for (const record of records) {
    const needsToken = !record.tableToken || !record.qrCodeUrl;
    const hasLegacyQr =
      isLegacyMenuQrUrl(record.qrCodeUrl, record.restaurantId, record.id) ||
      isLegacyMenuQrUrl(record.qrCode, record.restaurantId, record.id);

    if (!needsToken && !hasLegacyQr) {
      continue;
    }

    const tableToken = record.tableToken ?? generateSecureToken('tbl');
    const qrCodeUrl = buildTableQrUrl(tableToken);

    await prisma.restaurantTable.update({
      where: { id: record.id },
      data: {
        tableToken,
        qrCodeUrl,
        qrCode: tableToken,
      },
    });

    updatedCount += 1;
    console.log(`Updated table ${record.id} QR to ${qrCodeUrl}`);
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
