import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import type { UserPayload } from '../auth/interfaces/user-payload.interface';

type UpdateProductDtoLike = {
  name: string;
  sku: string;
  price: number;
  variants?: Array<{ size: string; color: string; quantity: number }>;
};

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: {
    createProduct: jest.Mock;
    listProducts: jest.Mock;
    addStock: jest.Mock;
    updateProductMetadata: jest.Mock;
    deleteProduct: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      createProduct: jest.fn(),
      listProducts: jest.fn(),
      addStock: jest.fn(),
      updateProductMetadata: jest.fn(),
      deleteProduct: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('delega updateProduct con tenantId y productId', async () => {
    const user = { tenantId: 't1' } as unknown as UserPayload;
    const dto: UpdateProductDtoLike = {
      name: 'X',
      sku: 'Y',
      price: 100,
      variants: [],
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await controller.update(user, 'p1', dto as any);

    expect(service.updateProductMetadata).toHaveBeenCalledWith('t1', 'p1', dto);
  });

  it('delega deleteProduct con tenantId y productId', async () => {
    const user = { tenantId: 't1' } as unknown as UserPayload;

    await controller.remove(user, 'p1');

    expect(service.deleteProduct).toHaveBeenCalledWith('t1', 'p1');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
