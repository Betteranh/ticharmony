import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TenantTransactionInterceptor } from './common/interceptors/tenant-transaction.interceptor';
import { AssetsModule } from './modules/assets/assets.module';
import { AuthModule } from './modules/auth/auth.module';
import { KnowledgeBaseModule } from './modules/knowledge-base/knowledge-base.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    NotificationsModule,
    TicketsModule,
    KnowledgeBaseModule,
    AssetsModule,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: TenantTransactionInterceptor },
  ],
})
export class AppModule {}
