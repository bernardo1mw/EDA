import { HealthController } from '@/infra/controllers/health.controller';
import { sharedProviders } from '@/infra/providers/shared.providers';
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [
    TerminusModule,
  ],
  controllers: [HealthController],
  providers: sharedProviders,
  exports: sharedProviders,
})
export class SharedModule {}
