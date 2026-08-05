import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SupplierPriceStatus } from '@prisma/client';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SupplierService {
  constructor(private readonly prisma: PrismaService) {}

  async createSupplier(dto: CreateSupplierDto) {
    const existing = await this.prisma.supplier.findUnique({
      where: { supplierCode: dto.supplierCode },
    });
    if (existing) throw new BadRequestException('Supplier code already registered');

    // Rule: If Purchase Order prefix configuration is missing, Supplier Status = Inactive (isActive = false)
    const isActuallyActive = dto.poPrefix
      ? dto.isActive !== undefined
        ? dto.isActive
        : true
      : false;

    return this.prisma.supplier.create({
      data: {
        supplierCode: dto.supplierCode,
        companyName: dto.companyName,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        email: dto.email,
        gstNumber: dto.gstNumber,
        address: dto.address,
        paymentTerms: dto.paymentTerms,
        creditLimit: dto.creditLimit || 0,
        poPrefix: dto.poPrefix || null,
        isActive: isActuallyActive,
      },
    });
  }

  async getSuppliers() {
    return this.prisma.supplier.findMany({
      include: {
        ingredientPrices: {
          include: { ingredient: true },
        },
      },
      orderBy: { companyName: 'asc' },
    });
  }

  async getSupplier(id: number) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        ingredientPrices: {
          include: { ingredient: true },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  async updateSupplier(id: number, dto: any) {
    const existing = await this.prisma.supplier.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Supplier not found');

    const updateData = { ...dto };
    // Rule: If Purchase Order prefix configuration is missing, Supplier Status = Inactive (isActive = false)
    const finalPoPrefix = dto.poPrefix !== undefined ? dto.poPrefix : existing.poPrefix;
    if (!finalPoPrefix) {
      updateData.isActive = false;
    }

    return this.prisma.supplier.update({
      where: { id },
      data: updateData,
    });
  }

  async deleteSupplier(id: number) {
    return this.prisma.supplier.delete({ where: { id } });
  }

  // Supplier-specific pricing mapping
  async mapIngredientPrice(
    supplierId: number,
    dto: { ingredientId: number; price: number; effectiveDate?: string; status?: string },
  ) {
    const [supplier, ingredient] = await Promise.all([
      this.prisma.supplier.findUnique({ where: { id: supplierId } }),
      this.prisma.ingredient.findUnique({ where: { id: dto.ingredientId } }),
    ]);

    if (!supplier) throw new NotFoundException('Supplier not found');
    if (!ingredient) throw new NotFoundException('Ingredient not found');

    const data: any = {
      price: dto.price,
    };
    if (dto.effectiveDate) data.effectiveDate = new Date(dto.effectiveDate);
    if (dto.status) data.status = dto.status as SupplierPriceStatus;

    return this.prisma.supplierIngredientPrice.upsert({
      where: {
        supplierId_ingredientId: {
          supplierId,
          ingredientId: dto.ingredientId,
        },
      },
      update: data,
      create: {
        supplierId,
        ingredientId: dto.ingredientId,
        price: dto.price,
        effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
        status: (dto.status || 'ACTIVE') as SupplierPriceStatus,
      },
      include: { ingredient: true },
    });
  }

  async getSupplierPrices(supplierId: number) {
    return this.prisma.supplierIngredientPrice.findMany({
      where: { supplierId },
      include: { ingredient: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSupplierPrice(priceId: number) {
    const existing = await this.prisma.supplierIngredientPrice.findUnique({
      where: { id: priceId },
    });
    if (!existing) throw new NotFoundException('Price mapping not found');
    return this.prisma.supplierIngredientPrice.delete({ where: { id: priceId } });
  }
}
