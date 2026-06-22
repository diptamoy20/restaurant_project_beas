type EnvValues = Record<string, string | undefined>;

function parsePort(rawPort: string | undefined, key = 'PORT', fallback = 4000): number {
  if (!rawPort) {
    return fallback;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${key} must be an integer between 1 and 65535`);
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

function parsePositiveNumber(rawValue: string | undefined, key: string, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${key} must be a positive number`);
  }

  return parsed;
}

function parseNumberInRange(
  rawValue: string | undefined,
  key: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = parsePositiveNumber(rawValue, key, fallback);

  if (parsed < min || parsed > max) {
    throw new Error(`${key} must be between ${min} and ${max}`);
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

function isValidUrl(candidate: string | undefined): boolean {
  if (!candidate) {
    return false;
  }

  try {
    new URL(candidate);
    return true;
  } catch {
    return false;
  }
}

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const env = config as EnvValues;
  const nodeEnv = env.NODE_ENV ?? 'development';
  const accessTokenSecret = env.ACCESS_TOKEN_SECRET ?? env.JWT_SECRET;
  const routingEnabled = parseBoolean(env.ROUTING_ENABLED, 'ROUTING_ENABLED', true);
  const routingProvider = (env.ROUTING_PROVIDER ?? 'osrm').toLowerCase();
  const docsEnabled = parseBoolean(env.DOCS_ENABLED, 'DOCS_ENABLED', nodeEnv !== 'production');
  const docsAllowInProduction = parseBoolean(
    env.DOCS_ALLOW_IN_PRODUCTION,
    'DOCS_ALLOW_IN_PRODUCTION',
    false,
  );
  const firebaseAuthEnabled = parseBoolean(
    env.FIREBASE_AUTH_ENABLED,
    'FIREBASE_AUTH_ENABLED',
    false,
  );
  const corsOrigins = (env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  if (nodeEnv === 'production' && corsOrigins.length === 0) {
    throw new Error('CORS_ORIGINS is required in production');
  }

  if (nodeEnv === 'production' && !env.DB_SSL) {
    throw new Error('DB_SSL must be explicitly set in production');
  }

  if (nodeEnv === 'production' && docsEnabled && !docsAllowInProduction) {
    throw new Error('DOCS_ENABLED in production requires DOCS_ALLOW_IN_PRODUCTION=true');
  }

  if (!accessTokenSecret) {
    throw new Error('ACCESS_TOKEN_SECRET is required');
  }

  if (!env.REFRESH_TOKEN_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET is required');
  }

  if (!env.RAZORPAY_KEY_ID) {
    throw new Error('RAZORPAY_KEY_ID is required');
  }

  if (!env.RAZORPAY_KEY_SECRET) {
    throw new Error('RAZORPAY_KEY_SECRET is required');
  }

  if (nodeEnv === 'production') {
    if (!env.CLOUDINARY_CLOUD_NAME) {
      throw new Error('CLOUDINARY_CLOUD_NAME is required in production');
    }

    if (!env.CLOUDINARY_API_KEY) {
      throw new Error('CLOUDINARY_API_KEY is required in production');
    }

    if (!env.CLOUDINARY_API_SECRET) {
      throw new Error('CLOUDINARY_API_SECRET is required in production');
    }
  }

  if (firebaseAuthEnabled) {
    if (!env.FIREBASE_PROJECT_ID) {
      throw new Error('FIREBASE_PROJECT_ID is required when FIREBASE_AUTH_ENABLED=true');
    }

    if (!env.FIREBASE_CLIENT_EMAIL) {
      throw new Error('FIREBASE_CLIENT_EMAIL is required when FIREBASE_AUTH_ENABLED=true');
    }

    if (!env.FIREBASE_PRIVATE_KEY) {
      throw new Error('FIREBASE_PRIVATE_KEY is required when FIREBASE_AUTH_ENABLED=true');
    }
  }

  if (nodeEnv !== 'development' && !env.QR_FRONTEND_URL) {
    throw new Error('QR_FRONTEND_URL is required in non-development environments');
  }

  if (env.QR_FRONTEND_URL && !isValidUrl(env.QR_FRONTEND_URL)) {
    throw new Error('QR_FRONTEND_URL must be a valid URL');
  }

  if (env.QR_ORDERING_APP_URL && !isValidUrl(env.QR_ORDERING_APP_URL)) {
    throw new Error('QR_ORDERING_APP_URL must be a valid URL');
  }

  if (!['osrm'].includes(routingProvider)) {
    throw new Error('ROUTING_PROVIDER must currently be "osrm"');
  }

  if (routingEnabled && env.ROUTING_BASE_URL && !isValidUrl(env.ROUTING_BASE_URL)) {
    throw new Error('ROUTING_BASE_URL must be a valid URL');
  }

  if (nodeEnv === 'production' && routingEnabled && !env.ROUTING_BASE_URL) {
    throw new Error('ROUTING_BASE_URL is required in production when ROUTING_ENABLED=true');
  }

  return {
    ...config,
    NODE_ENV: nodeEnv,
    PORT: parsePort(env.PORT),
    DELIVERY_TRACKING_SOCKET_PORT: parsePort(
      env.DELIVERY_TRACKING_SOCKET_PORT,
      'DELIVERY_TRACKING_SOCKET_PORT',
      7005,
    ),
    ACCESS_TOKEN_SECRET: accessTokenSecret,
    REFRESH_TOKEN_SECRET: env.REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRES_IN: env.ACCESS_TOKEN_EXPIRES_IN ?? env.JWT_EXPIRES_IN ?? '7d',
    REFRESH_TOKEN_EXPIRES_IN: env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
    LOGIN_LOCK_THRESHOLD: parsePositiveInt(env.LOGIN_LOCK_THRESHOLD, 'LOGIN_LOCK_THRESHOLD', 5),
    LOGIN_LOCK_DURATION_MINUTES: parsePositiveInt(
      env.LOGIN_LOCK_DURATION_MINUTES,
      'LOGIN_LOCK_DURATION_MINUTES',
      15,
    ),
    BCRYPT_ROUNDS: parseIntInRange(env.BCRYPT_ROUNDS, 'BCRYPT_ROUNDS', 10, 8, 14),
    CORS_ORIGINS: corsOrigins.join(','),
    CORS_ALLOWED_HEADERS:
      env.CORS_ALLOWED_HEADERS ?? 'Content-Type, Authorization, X-Client-Type, X-Client',
    CORS_EXPOSED_HEADERS: env.CORS_EXPOSED_HEADERS ?? '',
    CORS_MAX_AGE_SECONDS: parsePositiveInt(env.CORS_MAX_AGE_SECONDS, 'CORS_MAX_AGE_SECONDS', 600),
    TRUST_PROXY: parseBoolean(env.TRUST_PROXY, 'TRUST_PROXY', false),
    JWT_SECRET: accessTokenSecret,
    JWT_EXPIRES_IN: env.ACCESS_TOKEN_EXPIRES_IN ?? env.JWT_EXPIRES_IN ?? '7d',
    RESET_PASSWORD_TOKEN_EXPIRES_MINUTES: parsePositiveInt(
      env.RESET_PASSWORD_TOKEN_EXPIRES_MINUTES,
      'RESET_PASSWORD_TOKEN_EXPIRES_MINUTES',
      60,
    ),
    DOCS_ENABLED: docsEnabled,
    DOCS_ALLOW_IN_PRODUCTION: docsAllowInProduction,
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
    RATE_LIMIT_WINDOW_MS: parsePositiveInt(env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', 60000),
    RATE_LIMIT_MAX_REQUESTS: parsePositiveInt(
      env.RATE_LIMIT_MAX_REQUESTS,
      'RATE_LIMIT_MAX_REQUESTS',
      120,
    ),
    IMAGE_UPLOAD_MAX_MB: parseNumberInRange(
      env.IMAGE_UPLOAD_MAX_MB,
      'IMAGE_UPLOAD_MAX_MB',
      1,
      0.1,
      20,
    ),
    RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID,
    RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET,
    CLOUDINARY_CLOUD_NAME: env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: env.CLOUDINARY_API_SECRET,
    FIREBASE_AUTH_ENABLED: firebaseAuthEnabled,
    FIREBASE_PROJECT_ID: env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: env.FIREBASE_PRIVATE_KEY,
    QR_FRONTEND_URL: env.QR_FRONTEND_URL,
    QR_ORDERING_APP_URL: env.QR_ORDERING_APP_URL,
    ROUTING_ENABLED: routingEnabled,
    ROUTING_PROVIDER: routingProvider,
    ROUTING_BASE_URL: env.ROUTING_BASE_URL ?? 'https://router.project-osrm.org',
    ROUTING_TIMEOUT_MS: parsePositiveInt(env.ROUTING_TIMEOUT_MS, 'ROUTING_TIMEOUT_MS', 5000),
    ROUTING_OSRM_PROFILE: env.ROUTING_OSRM_PROFILE ?? 'driving',
  };
}
