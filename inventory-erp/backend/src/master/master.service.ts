import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MasterService {
  constructor(private readonly prisma: PrismaService) {}

  // Category CRUD
  async getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(name: string) {
    const existing = await this.prisma.category.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Category already exists');
    return this.prisma.category.create({ data: { name } });
  }

  async updateCategory(id: number, name: string) {
    return this.prisma.category.update({ where: { id }, data: { name } });
  }

  async deleteCategory(id: number) {
    return this.prisma.category.delete({ where: { id } });
  }

  // Units
  getUnits() {
    return ['KG', 'GM', 'L', 'ML', 'Piece', 'Packet', 'Bottle', 'Box'];
  }

  // Ingredient catalog CRUD
  async getIngredients() {
    return this.prisma.ingredient.findMany({
      include: { category: true },
      orderBy: { name: 'asc' },
    });
  }

  async getIngredient(id: number) {
    const item = await this.prisma.ingredient.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) throw new NotFoundException('Ingredient not found');
    return item;
  }

  async createIngredient(dto: CreateIngredientDto) {
    const existingSku = await this.prisma.ingredient.findUnique({ where: { sku: dto.sku } });
    if (existingSku) throw new BadRequestException('SKU code already exists');

    return this.prisma.ingredient.create({
      data: {
        sku: dto.sku,
        name: dto.name,
        categoryId: dto.categoryId,
        unit: dto.unit,
        minimumStock: dto.minimumStock || 0,
        maximumStock: dto.maximumStock || 100,
        reorderLevel: dto.reorderLevel || 10,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async updateIngredient(id: number, dto: any) {
    return this.prisma.ingredient.update({
      where: { id },
      data: dto,
    });
  }

  async deleteIngredient(id: number) {
    return this.prisma.ingredient.delete({ where: { id } });
  }

  // Quick seed master catalog categories
  async seedCategories() {
    const list = [
      'Grains',
      'Vegetables',
      'Dairy',
      'Meat',
      'Spices',
      'Beverages',
      'Cleaning Supplies',
    ];
    for (const name of list) {
      const existing = await this.prisma.category.findUnique({ where: { name } });
      if (!existing) {
        await this.prisma.category.create({ data: { name } });
      }
    }
    return { seeded: true };
  }

  // Brand CRUD
  async getBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: 'asc' } });
  }

  async createBrand(name: string) {
    const existing = await this.prisma.brand.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Brand already exists');
    return this.prisma.brand.create({ data: { name } });
  }

  async updateBrand(id: number, name: string) {
    return this.prisma.brand.update({ where: { id }, data: { name } });
  }

  async deleteBrand(id: number) {
    return this.prisma.brand.delete({ where: { id } });
  }

  // Tax CRUD
  async getTaxes() {
    return this.prisma.tax.findMany({ orderBy: { name: 'asc' } });
  }

  async createTax(name: string, rate: number) {
    const existing = await this.prisma.tax.findUnique({ where: { name } });
    if (existing) throw new BadRequestException('Tax already exists');
    return this.prisma.tax.create({ data: { name, rate } });
  }

  async updateTax(id: number, name: string, rate: number) {
    return this.prisma.tax.update({ where: { id }, data: { name, rate } });
  }

  async deleteTax(id: number) {
    return this.prisma.tax.delete({ where: { id } });
  }
}
