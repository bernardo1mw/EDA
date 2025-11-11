import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { StructuredLogger } from '../../core/logging';

@Controller('health')
export class HealthController {
  private readonly logger = new StructuredLogger('HealthController');

  constructor(
    private health: HealthCheckService,
    private db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    this.logger.log('Health check requested');
    
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    this.logger.log('Readiness check requested');
    
    return this.health.check([
      () => this.db.pingCheck('database'),
    ]);
  }

  @Get('live')
  liveness() {
    this.logger.log('Liveness check requested');
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'payment-service',
    };
  }
}
