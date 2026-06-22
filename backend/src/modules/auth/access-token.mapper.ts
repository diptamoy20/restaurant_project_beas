import { UnauthorizedException } from '@nestjs/common';

import { AuthenticatedUser, JwtPayload } from './auth.types';
import { getDefaultPermissionsForRoles } from '../../common/constants/default-permissions';

export function mapAccessTokenPayload(payload: JwtPayload): AuthenticatedUser {
  if (payload.type !== 'access') {
    throw new UnauthorizedException('Invalid token type');
  }

  const userId = Number(payload.sub ?? payload.userId);

  if (!Number.isInteger(userId) || userId <= 0 || !payload.role) {
    throw new UnauthorizedException('Invalid token payload');
  }

  return {
    id: userId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    profileImageUrl: payload.profileImageUrl ?? null,
    role: payload.role,
    permissions: payload.permissions ?? getDefaultPermissionsForRoles([payload.role]),
  };
}
