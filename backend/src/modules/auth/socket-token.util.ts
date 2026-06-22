const INVALID_TOKEN_LITERALS = new Set(['undefined', 'null', '[object object]']);

export function extractSocketToken(handshake: {
  auth?: unknown;
  headers?: { authorization?: unknown };
  query?: { token?: unknown };
}): string | null {
  const authToken = extractTokenValue(handshake.auth);

  if (authToken) {
    return authToken;
  }

  const header = handshake.headers?.authorization;

  if (typeof header === 'string') {
    const normalized = normalizeTokenCandidate(header);

    if (normalized) {
      return normalized;
    }
  }

  const queryToken = handshake.query?.token;

  if (typeof queryToken === 'string' || Array.isArray(queryToken)) {
    const normalized = normalizeTokenCandidate(queryToken);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function extractTokenValue(value: unknown): string | null {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string' || Array.isArray(value)) {
    return normalizeTokenCandidate(value);
  }

  if (typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;

  return (
    extractTokenValue(record.accessToken) ??
    extractTokenValue(record.access_token) ??
    extractTokenValue(record.token) ??
    extractTokenValue(record.data) ??
    extractTokenValue(record.auth) ??
    extractTokenValue(record.Authorization) ??
    extractTokenValue(record.authorization)
  );
}

function normalizeTokenCandidate(value: string | string[]): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const decoded = decodeTokenCandidate(raw);
  const trimmed = decoded.trim().replace(/^['"]+|['"]+$/g, '');

  if (!trimmed) {
    return null;
  }

  if (INVALID_TOKEN_LITERALS.has(trimmed.toLowerCase())) {
    return null;
  }

  const bearerStripped = trimmed.replace(/^Bearer\s+/i, '').trim();

  if (!bearerStripped || INVALID_TOKEN_LITERALS.has(bearerStripped.toLowerCase())) {
    return null;
  }

  if (
    (bearerStripped.startsWith('{') && bearerStripped.endsWith('}')) ||
    (bearerStripped.startsWith('[') && bearerStripped.endsWith(']'))
  ) {
    try {
      return extractTokenValue(JSON.parse(bearerStripped));
    } catch {
      return bearerStripped;
    }
  }

  return bearerStripped;
}

function decodeTokenCandidate(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isJwtFormat(token: string | null | undefined): boolean {
  const parts = token?.split('.');

  if (parts?.length !== 3) {
    return false;
  }

  return parts.every((part) => part.length > 0);
}

export function previewSocketToken(token: string | null | undefined): string {
  if (!token) {
    return 'null';
  }

  if (token.length <= 24) {
    return token;
  }

  return `${token.slice(0, 12)}...${token.slice(-12)}`;
}
