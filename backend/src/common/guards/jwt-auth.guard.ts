import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { ALLOW_WEB_KEY } from '../decorators/client.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const allowWeb = this.reflector.getAllAndOverride<boolean>(ALLOW_WEB_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<{
      method?: string;
      url?: string;
      headers?: { authorization?: string; ['x-client-type']?: string; ['x-client']?: string };
    }>();
    const authorization = request.headers?.authorization;
    const hasAuthorization = (authorization?.trim().length ?? 0) > 0;

    const clientTypeHeader =
      (request.headers?.['x-client-type'] as string) ||
      (request.headers?.['x-client'] as string) ||
      '';
    const clientType = clientTypeHeader.trim().toLowerCase();

    if (allowWeb && clientType !== 'web' && clientType !== 'mobile') {
      throw new UnauthorizedException('Unauthorized');
    }

    // Web catalog endpoints stay public, but any supplied bearer token must be verified.
    if (allowWeb && clientType === 'web' && !hasAuthorization) {
      return true;
    }

    if (isPublic) {
      return true;
    }

    if (this.configService.get<string>('AUTH_DEBUG') === 'true') {
      const hasBearerToken = authorization?.startsWith('Bearer ') ?? false;

      this.logger.debug(
        `JWT guard ${request.method ?? 'UNKNOWN'} ${request.url ?? 'UNKNOWN'} client=${clientType} authorizationHeader=${authorization ? 'present' : 'missing'} bearer=${hasBearerToken}`,
      );
    }

    return super.canActivate(context);
  }
}
