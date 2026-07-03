import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;

  const healthService = {
    checkDatabase: jest.fn().mockResolvedValue({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-06-07T00:00:00.000Z',
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should report the API as running', () => {
    expect(controller.checkApi()).toMatchObject({
      status: 'ok',
    });
    expect(controller.checkApi()).toHaveProperty('uptime');
    expect(controller.checkApi()).toHaveProperty('timestamp');
  });

  it('should delegate database health checks to HealthService', async () => {
    await expect(controller.checkDatabase()).resolves.toEqual({
      status: 'ok',
      database: 'connected',
      timestamp: '2026-06-07T00:00:00.000Z',
    });
  });
});
