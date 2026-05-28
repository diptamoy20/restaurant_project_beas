import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { JwtPayload, AuthenticatedUser } from './auth.types';
import { getDefaultPermissionsForRoles } from '../../common/constants/default-permissions';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('ACCESS_TOKEN_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    if (this.configService.get<string>('AUTH_DEBUG') === 'true') {
      this.logger.debug(
        `Decoded JWT userId=${payload.sub ?? payload.userId} email=${payload.email ?? 'null'} role=${payload.role ?? 'null'} type=${payload.type}`,
      );
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    const userId = payload.sub ?? payload.userId;

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid token payload');
    }

    if (!payload.role) {
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
}
