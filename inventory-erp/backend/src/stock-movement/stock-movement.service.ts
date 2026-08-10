import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  LedgerRefType,
  BranchStoreRequestStatus,
  StockStatus,
  TransferStatus,
} from '@prisma/client';

import { CreateStoreRequestDto, CreateTransferDto } from './dto/movement.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StockMovementService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoreStock(restaurantId: number) {
    return this.prisma.storeInventory.findMany({
      where: { restaurantId },
      include: { ingredient: { include: { category: true } } },
      orderBy: { ingredient: { name: 'asc' } },
    });
  }

  async getKitchenStock(restaurantId: number) {
    return this.prisma.kitchenInventory.findMany({
      where: { restaurantId },
      include: { ingredient: { include: { category: true } } },
      orderBy: { ingredient: { name: 'asc' } },
    });
  }

  async createKitchenTransfer(userId: number, dto: CreateTransferDto) {
    const transferNumber = `KT-${Date.now().toString().slice(-6)}`;

    return this.prisma.kitchenTransfer.create({
      data: {
        transferNumber,
        restaurantId: dto.restaurantId,
        requestedById: userId,
        notes: dto.notes || null,
        status: TransferStatus.PENDING,
        items: {
          create: dto.items.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
      },
    });
  }

  async getKitchenTransfers(restaurantId?: number) {
    return this.prisma.kitchenTransfer.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveKitchenTransfer(transferId: number, userId: number) {
    const transfer = await this.prisma.kitchenTransfer.findUnique({
      where: { id: transferId },
      include: { items: { include: { ingredient: true } } },
    });

    if (!transfer) throw new NotFoundException('Kitchen transfer request not found');
    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(`Transfer is already ${transfer.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of transfer.items) {
        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        if (!storeStock || storeStock.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient Store room stock for ingredient "${item.ingredient.name}". Available: ${storeStock?.availableQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        const storeBefore = storeStock.availableQuantity;
        const storeAfter = storeBefore - item.quantity;
        const storeMin = storeStock.minimumStock;
        const newStoreStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        await tx.storeInventory.update({
          where: { id: storeStock.id },
          data: { availableQuantity: storeAfter, status: newStoreStatus },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'STORE',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: -item.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });

        const kitchenStock = await tx.kitchenInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const kitchenBefore = kitchenStock?.availableQuantity ?? 0;
        const kitchenAfter = kitchenBefore + item.quantity;
        const kitchenMin = kitchenStock?.minimumStock ?? 5;
        const newKitchenStatus: StockStatus =
          kitchenAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : kitchenAfter <= kitchenMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (kitchenStock) {
          await tx.kitchenInventory.update({
            where: { id: kitchenStock.id },
            data: { availableQuantity: kitchenAfter, status: newKitchenStatus },
          });
        } else {
          await tx.kitchenInventory.create({
            data: {
              restaurantId: transfer.restaurantId,
              ingredientId: item.ingredientId,
              availableQuantity: kitchenAfter,
              minimumStock: 5,
              status: newKitchenStatus,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'KITCHEN',
            locationId: transfer.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: transfer.transferNumber,
            quantity: item.quantity,
            beforeQuantity: kitchenBefore,
            afterQuantity: kitchenAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });

        if (
          newStoreStatus === StockStatus.LOW_STOCK ||
          newStoreStatus === StockStatus.OUT_OF_STOCK
        ) {
          const reqNum = `SR-AUTO-${Date.now().toString().slice(-6)}`;
          await tx.branchStoreRequest.create({
            data: {
              requestNumber: reqNum,
              restaurantId: transfer.restaurantId,
              status: BranchStoreRequestStatus.PENDING,
              isAutoGenerated: true,
              requestedById: userId,
              notes: `Auto-generated: Store room stock for ${item.ingredient.name} fell below minimum (${storeMin} ${item.ingredient.unit})`,
              items: {
                create: [
                  {
                    ingredientId: item.ingredientId,
                    quantity: (storeStock.maximumStock || 100) - storeAfter,
                  },
                ],
              },
            },
          });
        }
      }

      return tx.kitchenTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.APPROVED, approvedById: userId },
      });
    });
  }

  async createStoreRequest(userId: number, dto: CreateStoreRequestDto) {
    const requestNumber = `SR-${Date.now().toString().slice(-6)}`;

    return this.prisma.branchStoreRequest.create({
      data: {
        requestNumber,
        restaurantId: dto.restaurantId,
        status: BranchStoreRequestStatus.PENDING,
        isAutoGenerated: false,
        requestedById: userId,
        notes: dto.notes || null,
        items: {
          create: dto.items.map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        items: { include: { ingredient: true } },
      },
    });
  }

  async getStoreRequests(restaurantId?: number) {
    return this.prisma.branchStoreRequest.findMany({
      where: restaurantId ? { restaurantId } : undefined,
      include: {
        items: { include: { ingredient: true } },
        requestedBy: { select: { id: true, name: true } },
        fulfilledBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async fulfillStoreRequest(requestId: number, warehouseId: number, userId: number) {
    const req = await this.prisma.branchStoreRequest.findUnique({
      where: { id: requestId },
      include: { items: { include: { ingredient: true } } },
    });

    if (!req) throw new NotFoundException('Store Request not found');
    if (req.status !== BranchStoreRequestStatus.PENDING) {
      throw new BadRequestException(`Store Request is already ${req.status}`);
    }

    const warehouse = await this.prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    return this.prisma.$transaction(async (tx) => {
      for (const item of req.items) {
        const whStock = await tx.warehouseInventory.findUnique({
          where: {
            warehouseId_ingredientId: {
              warehouseId,
              ingredientId: item.ingredientId,
            },
          },
        });

        if (!whStock || whStock.availableQuantity < item.quantity) {
          throw new BadRequestException(
            `Insufficient Warehouse stock for ingredient "${item.ingredient.name}". Available: ${whStock?.availableQuantity ?? 0}, Requested: ${item.quantity}`,
          );
        }

        const whBefore = whStock.availableQuantity;
        const whAfter = whBefore - item.quantity;

        await tx.warehouseInventory.update({
          where: { id: whStock.id },
          data: { availableQuantity: whAfter },
        });

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'WAREHOUSE',
            locationId: warehouseId,
            refType: LedgerRefType.TRANSFER,
            referenceId: req.requestNumber,
            quantity: -item.quantity,
            beforeQuantity: whBefore,
            afterQuantity: whAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });

        const storeStock = await tx.storeInventory.findUnique({
          where: {
            restaurantId_ingredientId: {
              restaurantId: req.restaurantId,
              ingredientId: item.ingredientId,
            },
          },
        });

        const storeBefore = storeStock?.availableQuantity ?? 0;
        const storeAfter = storeBefore + item.quantity;
        const storeMin = storeStock?.minimumStock ?? 10;
        const newStoreStatus: StockStatus =
          storeAfter <= 0
            ? StockStatus.OUT_OF_STOCK
            : storeAfter <= storeMin
              ? StockStatus.LOW_STOCK
              : StockStatus.HEALTHY;

        if (storeStock) {
          await tx.storeInventory.update({
            where: { id: storeStock.id },
            data: { availableQuantity: storeAfter, status: newStoreStatus },
          });
        } else {
          await tx.storeInventory.create({
            data: {
              restaurantId: req.restaurantId,
              ingredientId: item.ingredientId,
              availableQuantity: storeAfter,
              minimumStock: storeMin,
              maximumStock: 200,
              reorderLevel: storeMin + 5,
              status: newStoreStatus,
            },
          });
        }

        await tx.stockLedger.create({
          data: {
            ingredientId: item.ingredientId,
            locationType: 'STORE',
            locationId: req.restaurantId,
            refType: LedgerRefType.TRANSFER,
            referenceId: req.requestNumber,
            quantity: item.quantity,
            beforeQuantity: storeBefore,
            afterQuantity: storeAfter,
            unit: item.ingredient.unit,
            userId,
          },
        });
      }

      return tx.branchStoreRequest.update({
        where: { id: requestId },
        data: { status: BranchStoreRequestStatus.FULFILLED, fulfilledById: userId },
      });
    });
  }
}
