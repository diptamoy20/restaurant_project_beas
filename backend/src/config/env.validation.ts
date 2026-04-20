type EnvValues = Record<string, string | undefined>;

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return 4000;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

function parsePositiveInt(rawValue: string | undefined, key: string, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive integer`);
  }

  return parsed;
}

function parseBoolean(rawValue: string | undefined, key: string, fallback: boolean): boolean {
  if (!rawValue) {
    return fallback;
  }

  const normalized = rawValue.toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw new Error(`${key} must be either "true" or "false"`);
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = config as EnvValues;
  const nodeEnv = env.NODE_ENV ?? 'development';

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: parsePort(env.PORT),
    JWT_EXPIRES_IN: env.JWT_EXPIRES_IN ?? '7d',
    DOCS_ENABLED: parseBoolean(env.DOCS_ENABLED, 'DOCS_ENABLED', nodeEnv !== 'production'),
    DB_POOL_MAX: parsePositiveInt(env.DB_POOL_MAX, 'DB_POOL_MAX', 20),
    DB_POOL_IDLE_TIMEOUT_MS: parsePositiveInt(
      env.DB_POOL_IDLE_TIMEOUT_MS,
      'DB_POOL_IDLE_TIMEOUT_MS',
      30000,
    ),
    DB_POOL_CONNECTION_TIMEOUT_MS: parsePositiveInt(
      env.DB_POOL_CONNECTION_TIMEOUT_MS,
      'DB_POOL_CONNECTION_TIMEOUT_MS',
      5000,
    ),
    DB_SSL: parseBoolean(env.DB_SSL, 'DB_SSL', false),
    DB_SSL_REJECT_UNAUTHORIZED: parseBoolean(
      env.DB_SSL_REJECT_UNAUTHORIZED,
      'DB_SSL_REJECT_UNAUTHORIZED',
      true,
    ),
  };
}
