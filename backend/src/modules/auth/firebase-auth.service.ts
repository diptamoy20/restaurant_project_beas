import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Auth, DecodedIdToken, UserRecord } from 'firebase-admin/auth';

import { FirebaseAdminService } from '../../common/firebase/firebase-admin.service';

@Injectable()
export class FirebaseAuthService {
  private readonly logger = new Logger(FirebaseAuthService.name);
  private readonly enabled: boolean;
  private readonly auth: Auth | null;

  constructor(
    private readonly configService: ConfigService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {
    this.enabled = this.configService.get<boolean>('FIREBASE_AUTH_ENABLED') ?? false;
    this.auth = this.enabled ? this.firebaseAdminService.getAuth() : null;
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

  async getUser(uid: string): Promise<UserRecord> {
    if (!this.enabled || !this.auth) {
      throw new ServiceUnavailableException('Social login is not configured');
    }

    try {
      return await this.auth.getUser(uid);
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown';
      this.logger.warn(`Firebase user lookup failed: ${code}`);
      throw new UnauthorizedException('Invalid social login token');
    }
  }
}
