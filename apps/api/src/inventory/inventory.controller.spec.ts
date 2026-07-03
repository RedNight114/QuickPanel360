import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { prismaGuardMock } from '../test/prisma-guard.mock';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';

describe('InventoryController', () => {
  let controller: InventoryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            findAll: jest.fn(),
            findMovements: jest.fn(),
            addStock: jest.fn(),
            adjustStock: jest.fn(),
            wasteStock: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaGuardMock,
        },
      ],
    }).compile();

    controller = module.get<InventoryController>(InventoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
