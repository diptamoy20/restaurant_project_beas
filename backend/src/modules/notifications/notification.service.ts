import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { FirebaseAdminService } from '../../common/firebase/firebase-admin.service';
import { PrismaService } from '../../prisma/prisma.service';

type SendPushToUserPayload = {
  userId: number;
  title: string;
  body: string;
  data?: Record<string, string>;
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseAdminService: FirebaseAdminService,
  ) {}

  async sendPushToUser(payload: SendPushToUserPayload): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: payload.userId,
        title: payload.title,
        message: payload.body,
      },
    });

    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId: payload.userId,
      },
      select: {
        token: true,
      },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No FCM device tokens found for user ${payload.userId}`);
      return;
    }

    const messaging = this.firebaseAdminService.getMessaging();
    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((deviceToken) => deviceToken.token),
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data,
    });

    if (response.failureCount === 0) {
      return;
    }

    const invalidTokens = response.responses
      .map((sendResponse, index) => {
        if (sendResponse.success) {
          return null;
        }

        const code = sendResponse.error?.code;
        this.logger.warn(`FCM send failed for user ${payload.userId}: ${code ?? 'unknown error'}`);

        if (
          code === 'messaging/registration-token-not-registered' ||
          code === 'messaging/invalid-registration-token'
        ) {
          return tokens[index].token;
        }

        return null;
      })
      .filter((token): token is string => Boolean(token));

    if (invalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: {
          token: {
            in: invalidTokens,
          },
        },
      });
    }
  }

  async registerDeviceToken(
    userId: number,
    token: string,
    platform?: string,
  ): Promise<{ message: string }> {
    const data: Prisma.DeviceTokenUncheckedCreateInput = {
      userId,
      token,
      platform: platform?.trim() || null,
      lastSeenAt: new Date(),
    };

    await this.prisma.deviceToken.upsert({
      where: { token },
      create: data,
      update: {
        userId,
        platform: data.platform,
        lastSeenAt: data.lastSeenAt,
      },
    });

    return { message: 'Device token registered successfully' };
  }

  async unregisterDeviceToken(userId: number, token: string): Promise<{ message: string }> {
    await this.prisma.deviceToken.deleteMany({
      where: {
        userId,
        token,
      },
    });

    return { message: 'Device token unregistered successfully' };
  }
}
