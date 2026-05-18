import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ALLOW_WEB_KEY } from '../decorators/client.decorator';

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
      headers?: { authorization?: string; ['x-client-type']?: string };
    }>();

    const clientTypeHeader = (request.headers?.['x-client-type'] as string) || request.headers?.['x-client'] as string || '';
    const clientType = clientTypeHeader?.toLowerCase() === 'mobile' ? 'mobile' : 'web';

    // If controller/method allows web and client is web, skip auth
    if (allowWeb && clientType !== 'mobile') {
      return true;
    }

    if (isPublic) {
      return true;
    }

    if (this.configService.get<string>('AUTH_DEBUG') === 'true') {
      const authorization = request.headers?.authorization;
      const hasBearerToken = authorization?.startsWith('Bearer ') ?? false;

      this.logger.debug(
        `JWT guard ${request.method ?? 'UNKNOWN'} ${request.url ?? 'UNKNOWN'} client=${clientType} authorizationHeader=${authorization ? 'present' : 'missing'} bearer=${hasBearerToken}`,
      );
    }

    return super.canActivate(context);
  }
}
