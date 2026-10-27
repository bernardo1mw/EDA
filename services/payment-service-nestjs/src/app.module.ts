import { Module } from '@nestjs/common';
import { PaymentModule } from './infra/modules/payment.module';
import { SharedModule } from './infra/modules/shared.module';
import { RepositoryModule } from './infra/modules/repository.module';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import appConfig from './core/config';
import { InitialSchema1700000000000 } from './migrations/1700000000000-InitialSchema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => ({
        type: 'postgres',
        host: config.database.host,
        port: config.database.port,
        username: config.database.username,
        password: config.database.password,
        database: config.database.database,
        entities: [
          __dirname + '/domain/models/*.entity.{js,ts}',
        ],
        autoLoadEntities: true,
        synchronize: false,
        migrations: [InitialSchema1700000000000],
        migrationsRun: true,
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

