import { ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

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

    if (isPublic) {
      return true;
    }

    if (this.configService.get<string>('AUTH_DEBUG') === 'true') {
      const request = context.switchToHttp().getRequest<{
        method?: string;
        url?: string;
        headers?: { authorization?: string };
      }>();
      const authorization = request.headers?.authorization;
      const hasBearerToken = authorization?.startsWith('Bearer ') ?? false;

      this.logger.debug(
        `JWT guard ${request.method ?? 'UNKNOWN'} ${request.url ?? 'UNKNOWN'} authorizationHeader=${authorization ? 'present' : 'missing'} bearer=${hasBearerToken}`,
      );
    }

    return super.canActivate(context);
  }
}
