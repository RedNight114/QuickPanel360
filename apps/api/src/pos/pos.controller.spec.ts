import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { prismaGuardMock } from '../test/prisma-guard.mock';
import { PosController } from './pos.controller';
import { PosService } from './pos.service';

describe('PosController', () => {
  let controller: PosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PosController],
      providers: [
        {
          provide: PosService,
          useValue: {
            openSession: jest.fn(),
            getCurrentSession: jest.fn(),
            closeSession: jest.fn(),
            createSale: jest.fn(),
            findSales: jest.fn(),
            findSaleById: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaGuardMock,
        },
      ],
    }).compile();

    controller = module.get<PosController>(PosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
