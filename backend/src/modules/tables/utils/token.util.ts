import { randomBytes } from 'crypto';

export function generateSecureToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString('base64url')}`;
}
