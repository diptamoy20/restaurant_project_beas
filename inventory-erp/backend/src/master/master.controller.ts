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

import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { MasterService } from './master.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Ingredient & Master Data')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@Controller('master')
export class MasterController {
  constructor(private readonly masterService: MasterService) {}

  @Get('categories')
  @ApiOperation({ summary: 'List all inventory categories' })
  getCategories() {
    return this.masterService.getCategories();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('categories')
  @ApiOperation({ summary: 'Create new category' })
  createCategory(@Body('name') name: string) {
    return this.masterService.createCategory(name);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Put('categories/:id')
  @ApiOperation({ summary: 'Update category' })
  updateCategory(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterService.updateCategory(id, name);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete category' })
  deleteCategory(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.deleteCategory(id);
  }

  @Get('units')
  @ApiOperation({ summary: 'List standard Units of Measure (UOM)' })
  getUnits() {
    return this.masterService.getUnits();
  }

  @Get('ingredients')
  @ApiOperation({ summary: 'List all raw materials in Master catalog' })
  getIngredients() {
    return this.masterService.getIngredients();
  }

  @Get('ingredients/:id')
  @ApiOperation({ summary: 'Get single ingredient master catalog detail' })
  getIngredient(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.getIngredient(id);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('ingredients')
  @ApiOperation({ summary: 'Create new catalog ingredient' })
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.masterService.createIngredient(dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Put('ingredients/:id')
  @ApiOperation({ summary: 'Update catalog ingredient limits or properties' })
  updateIngredient(@Param('id', ParseIntPipe) id: number, @Body() dto: any) {
    return this.masterService.updateIngredient(id, dto);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete('ingredients/:id')
  @ApiOperation({ summary: 'Delete catalog ingredient' })
  deleteIngredient(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.deleteIngredient(id);
  }

  @Post('seed-categories')
  @ApiOperation({ summary: 'Utility endpoint to seed basic categories' })
  seedCategories() {
    return this.masterService.seedCategories();
  }

  // Brand CRUD
  @Get('brands')
  @ApiOperation({ summary: 'List all brands' })
  getBrands() {
    return this.masterService.getBrands();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('brands')
  @ApiOperation({ summary: 'Create new brand' })
  createBrand(@Body('name') name: string) {
    return this.masterService.createBrand(name);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Put('brands/:id')
  @ApiOperation({ summary: 'Update brand' })
  updateBrand(@Param('id', ParseIntPipe) id: number, @Body('name') name: string) {
    return this.masterService.updateBrand(id, name);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete('brands/:id')
  @ApiOperation({ summary: 'Delete brand' })
  deleteBrand(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.deleteBrand(id);
  }

  // Tax CRUD
  @Get('taxes')
  @ApiOperation({ summary: 'List all taxes' })
  getTaxes() {
    return this.masterService.getTaxes();
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Post('taxes')
  @ApiOperation({ summary: 'Create new tax' })
  createTax(@Body('name') name: string, @Body('rate') rate: number) {
    return this.masterService.createTax(name, rate);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Put('taxes/:id')
  @ApiOperation({ summary: 'Update tax' })
  updateTax(
    @Param('id', ParseIntPipe) id: number,
    @Body('name') name: string,
    @Body('rate') rate: number,
  ) {
    return this.masterService.updateTax(id, name, rate);
  }

  @Roles(RoleType.SUPER_ADMIN, RoleType.INVENTORY_MANAGER)
  @Delete('taxes/:id')
  @ApiOperation({ summary: 'Delete tax' })
  deleteTax(@Param('id', ParseIntPipe) id: number) {
    return this.masterService.deleteTax(id);
  }
}
