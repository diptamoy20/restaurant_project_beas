import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { mapAccessTokenPayload } from './access-token.mapper';
import { AuthenticatedUser, JwtPayload } from './auth.types';

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

    return mapAccessTokenPayload(payload);
  }
}
