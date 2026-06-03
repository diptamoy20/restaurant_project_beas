import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, getApps, initializeApp, App } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';

const FIREBASE_APP_NAME = 'restaurant-firebase-admin';

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly enabled: boolean;
  private readonly app: App | null;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('FIREBASE_AUTH_ENABLED') ?? false;
    this.app = this.enabled ? this.createApp() : null;
  }

  getAuth(): Auth {
    if (!this.app) {
      throw new ServiceUnavailableException('Firebase is not configured');
    }

    return getAuth(this.app);
  }

  getMessaging(): Messaging {
    if (!this.app) {
      throw new ServiceUnavailableException('Firebase is not configured');
    }

    return getMessaging(this.app);
  }

  private createApp(): App {
    const existingApp = getApps().find((candidate) => candidate.name === FIREBASE_APP_NAME);

    if (existingApp) {
      return existingApp;
    }

    const projectId = this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.getOrThrow<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
      .replace(/\\n/g, '\n');

    this.logger.log(`Initializing Firebase Admin SDK for project ${projectId}`);

    return initializeApp(
      {
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      },
      FIREBASE_APP_NAME,
    );
  }
}
