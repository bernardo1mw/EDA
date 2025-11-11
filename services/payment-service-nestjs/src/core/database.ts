import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get<string>('app.database.host'),
  port: configService.get<number>('app.database.port'),
  username: configService.get<string>('app.database.username'),
  password: configService.get<string>('app.database.password'),
  database: configService.get<string>('app.database.database'),
  entities: [__dirname + '/../domain/models/*.entity{.ts,.js}'],
  synchronize: false, // Never use in production
  logging: configService.get<string>('app.environment') === 'development',
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: false,
});

