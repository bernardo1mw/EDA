import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockTypeOrmHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: mockHealthCheckService },
        { provide: TypeOrmHealthIndicator, useValue: mockTypeOrmHealthIndicator },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check (GET /health)', () => {
    it('returns health check result from HealthCheckService', async () => {
      const dbIndicator = { database: { status: 'up' } };
      mockTypeOrmHealthIndicator.pingCheck.mockResolvedValue(dbIndicator);
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: { database: { status: 'up' } },
      });

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
    });

    it('propagates unhealthy status when DB is down', async () => {
      mockHealthCheckService.check.mockRejectedValue(new Error('DB connection refused'));

      await expect(controller.check()).rejects.toThrow('DB connection refused');
    });
  });

  describe('readiness (GET /health/ready)', () => {
    it('returns ready status when DB ping succeeds', async () => {
      mockTypeOrmHealthIndicator.pingCheck.mockResolvedValue({ database: { status: 'up' } });
      mockHealthCheckService.check.mockResolvedValue({
        status: 'ok',
        details: { database: { status: 'up' } },
      });

      const result = await controller.readiness();

      expect(result.status).toBe('ok');
      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
    });

    it('propagates error when DB is not ready', async () => {
      mockHealthCheckService.check.mockRejectedValue(new Error('DB not ready'));

      await expect(controller.readiness()).rejects.toThrow('DB not ready');
    });
  });

  describe('liveness (GET /health/live)', () => {
    it('returns ok status without DB check', () => {
      const result = controller.liveness();

      expect(result.status).toBe('ok');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('service');
      expect(result.service).toBe('payment-service');
      expect(mockHealthCheckService.check).not.toHaveBeenCalled();
    });
  });
});
