import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma } from '@prisma/client';
import { Pool } from 'pg';

type BoolConfig = {
  sslEnabled: boolean;
  rejectUnauthorized: boolean;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }

  return value.toLowerCase() === 'true';
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Database pool values must be positive integers');
  }

  return parsed;
}

function readDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }

  return databaseUrl;
}

function resolveSchema(databaseUrl: URL): string {
  const schema = databaseUrl.searchParams.get('schema');
  if (!schema) {
    throw new Error('DATABASE_URL must include schema=restaurant_management');
  }

  if (schema !== 'restaurant_management') {
    throw new Error('DATABASE_URL schema must be restaurant_management');
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(schema)) {
    throw new Error('DATABASE_URL schema must be a valid PostgreSQL schema name');
  }

  return schema;
}

function resolveSslConfig(): BoolConfig {
  return {
    sslEnabled: parseBoolean(process.env.DB_SSL, false),
    rejectUnauthorized: parseBoolean(process.env.DB_SSL_REJECT_UNAUTHORIZED, true),
  };
}

export function createPrismaClientOptions(): {
  pool: Pool;
  options: Prisma.PrismaClientOptions;
} {
  const rawDatabaseUrl = readDatabaseUrl();
  const databaseUrl = new URL(rawDatabaseUrl);
  const schema = resolveSchema(databaseUrl);

  const { sslEnabled, rejectUnauthorized } = resolveSslConfig();

  const pool = new Pool({
    connectionString: rawDatabaseUrl,
    options: `-c search_path=${schema}`,
    max: parsePositiveInt(process.env.DB_POOL_MAX, 20),
    idleTimeoutMillis: parsePositiveInt(process.env.DB_POOL_IDLE_TIMEOUT_MS, 30000),
    connectionTimeoutMillis: parsePositiveInt(process.env.DB_POOL_CONNECTION_TIMEOUT_MS, 5000),
    ssl: sslEnabled ? { rejectUnauthorized } : undefined,
  });

  const options = {
    adapter: new PrismaPg(pool, { schema }),
  } as unknown as Prisma.PrismaClientOptions;

  return { pool, options };
}
