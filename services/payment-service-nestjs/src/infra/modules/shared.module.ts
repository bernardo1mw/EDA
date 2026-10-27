import { HealthController } from '@/infra/controllers/health.controller';
import { MetricsController } from '@/infra/controllers/metrics.controller';
import { sharedProviders } from '@/infra/providers/shared.providers';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { MetricsMiddleware } from '@/core/metrics';

@Module({
  imports: [
    TerminusModule,
  ],
  controllers: [HealthController, MetricsController],
  providers: sharedProviders,
  exports: sharedProviders,
})
export class SharedModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(MetricsMiddleware).forRoutes('*');
  }
}
