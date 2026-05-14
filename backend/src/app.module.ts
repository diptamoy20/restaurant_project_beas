import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GeoCacheModule } from './common/cache/geo-cache.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { StandardResponseInterceptor } from './common/interceptors/standard-response.interceptor';
import { RateLimitMiddleware } from './common/middleware/rate-limit.middleware';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { validateEnv } from './config/env.validation';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { CartModule } from './modules/cart/cart.module';
import { DeliveriesModule } from './modules/deliveries/deliveries.module';
import { LocationModule } from './modules/location/location.module';
import { MembershipModule } from './modules/membership/membership.module';
import { MenuModule } from './modules/menu/menu.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { QrModule } from './modules/qr/qr.module';
import { RestaurantsModule } from './modules/restaurants/restaurants.module';
import { UserAddressesModule } from './modules/user-addresses/user-addresses.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    GeoCacheModule,
    PrismaModule,
    AuthModule,
    RestaurantsModule,
    MenuModule,
    LocationModule,
    CartModule,
    OrdersModule,
    MembershipModule,
    PaymentsModule,
    NotificationsModule,
    AdminModule,
    DeliveriesModule,
    QrModule,
    UserAddressesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: RequestLoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: StandardResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware, RateLimitMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
