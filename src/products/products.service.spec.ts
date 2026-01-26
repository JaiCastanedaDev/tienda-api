import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: {
            product: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            productVariant: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
            stock: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            },
            variantImage: {
              createMany: jest.fn(),
              updateMany: jest.fn(),
              create: jest.fn(),
            },
            stockMovement: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
