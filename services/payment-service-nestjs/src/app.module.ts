import { Module } from '@nestjs/common';
import { PaymentModule } from './infra/modules/payment.module';
import { SharedModule } from './infra/modules/shared.module';
import { RepositoryModule } from './infra/modules/repository.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './core/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        username: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'payment_service',
        entities: [
          __dirname + '/domain/models/*.entity.{js,ts}',
        ],
        autoLoadEntities: true,
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    SharedModule,
    RepositoryModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

