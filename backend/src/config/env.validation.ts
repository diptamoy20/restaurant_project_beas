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

function parseIntInRange(
  rawValue: string | undefined,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = parsePositiveInt(rawValue, key, fallback);

  if (parsed < min || parsed > max) {
    throw new Error(`${key} must be between ${min} and ${max}`);
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
  const accessTokenSecret = env.ACCESS_TOKEN_SECRET ?? env.JWT_SECRET;
  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const clientOrigins = (env.CLIENT_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const resolvedOrigins = corsOrigins.length > 0 ? corsOrigins : clientOrigins;

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (nodeEnv === 'production' && resolvedOrigins.length === 0) {
    throw new Error('CORS_ORIGINS or CLIENT_ORIGIN is required in production');
  }

  if (!accessTokenSecret) {
    throw new Error('ACCESS_TOKEN_SECRET is required');
  }

  if (!env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is required');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: parsePort(env.PORT),
    ACCESS_TOKEN_SECRET: accessTokenSecret,
    REFRESH_TOKEN_SECRET: env.REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: env.ACCESS_TOKEN_EXPIRES_IN ?? env.JWT_EXPIRES_IN ?? '15m',
    REFRESH_TOKEN_EXPIRES_IN: env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
    LOGIN_LOCK_THRESHOLD: parsePositiveInt(env.LOGIN_LOCK_THRESHOLD, 'LOGIN_LOCK_THRESHOLD', 5),
    LOGIN_LOCK_DURATION_MINUTES: parsePositiveInt(
      env.LOGIN_LOCK_DURATION_MINUTES,
      'LOGIN_LOCK_DURATION_MINUTES',
      15,
    ),
    BCRYPT_ROUNDS: parseIntInRange(env.BCRYPT_ROUNDS, 'BCRYPT_ROUNDS', 10, 8, 14),
    CORS_ORIGINS: resolvedOrigins.join(','),
    CLIENT_ORIGIN: clientOrigins.join(','),
    CORS_ALLOWED_HEADERS: env.CORS_ALLOWED_HEADERS ?? 'Content-Type, Authorization',
    CORS_EXPOSED_HEADERS: env.CORS_EXPOSED_HEADERS ?? '',
    CORS_MAX_AGE_SECONDS: parsePositiveInt(env.CORS_MAX_AGE_SECONDS, 'CORS_MAX_AGE_SECONDS', 600),
    ADMIN_SOCKET_TOKEN: env.ADMIN_SOCKET_TOKEN ?? '',
    MONGO_URI: env.MONGO_URI ?? '',
    JWT_SECRET: accessTokenSecret,
    JWT_EXPIRES_IN: env.ACCESS_TOKEN_EXPIRES_IN ?? env.JWT_EXPIRES_IN ?? '15m',
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
