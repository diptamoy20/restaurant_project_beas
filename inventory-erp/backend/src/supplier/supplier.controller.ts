import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RoleType } from '@prisma/client';

import { CreateSupplierDto } from './dto/create-supplier.dto';
import { SupplierService } from './supplier.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Supplier Management')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @ApiOperation({ summary: 'List all suppliers and their mapped ingredient pricing' })
  getSuppliers() {
    return this.supplierService.getSuppliers();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single supplier' })
  getSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.getSupplier(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post()
  @ApiOperation({ summary: 'Create new supplier' })
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.supplierService.createSupplier(dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Put(':id')
  @ApiOperation({ summary: 'Update supplier configuration' })
  updateSupplier(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.supplierService.updateSupplier(id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a supplier profile' })
  deleteSupplier(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.deleteSupplier(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Post(':id/pricing')
  @ApiOperation({ summary: 'Map an ingredient with supplier-specific price' })
  mapIngredientPrice(
    @Param('id', ParseIntPipe) supplierId: number,
    @Body() dto: { ingredientId: number; price: number; effectiveDate?: string; status?: string },
  ) {
    return this.supplierService.mapIngredientPrice(supplierId, dto);
  }

  @Get(':id/pricing')
  @ApiOperation({ summary: 'Get all ingredient prices mapped to a supplier' })
  getSupplierPrices(@Param('id', ParseIntPipe) supplierId: number) {
    return this.supplierService.getSupplierPrices(supplierId);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER, RoleType.PROCUREMENT_MANAGER)
  @Delete(':id/pricing/:priceId')
  @ApiOperation({ summary: 'Remove a supplier ingredient price mapping' })
  deleteSupplierPrice(
    @Param('id', ParseIntPipe) supplierId: number,
    @Param('priceId', ParseIntPipe) priceId: number,
  ) {
    return this.supplierService.deleteSupplierPrice(priceId);
  }
}
