import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Auth, DecodedIdToken, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private readonly enabled: boolean;
  private readonly auth: Auth | null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('FIREBASE_AUTH_ENABLED') ?? false;
    this.auth = this.enabled ? this.createAuthClient() : null;
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    if (!this.enabled || !this.auth) {
      throw new ServiceUnavailableException('Social login is not configured');
    }

    try {
      return await this.auth.verifyIdToken(idToken, true);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
      this.logger.warn(`Firebase ID token verification failed: ${code}`);
      throw new UnauthorizedException('Invalid social login token');
    }
  }

  private createAuthClient(): Auth {
    const projectId = this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
      .replace(/\\n/g, '\n');

    const app =
      getApps().find((candidate) => candidate.name === 'restaurant-social-auth') ??
      initializeApp(
        {
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
        },
        'restaurant-social-auth',
      );

    return getAuth(app);
  }
}
