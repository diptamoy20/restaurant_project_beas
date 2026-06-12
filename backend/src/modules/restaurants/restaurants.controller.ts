import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
  Query,
  Body,
  UseGuards,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiCreatedResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/create-update-restaurant.dto';
import { ListRestaurantsQueryDto } from './dto/list-restaurants-query.dto';
import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import {
  PaginatedRestaurantResponseDto,
  RestaurantResponseDto,
} from './dto/restaurant-response.dto';
import {
  CreateRestaurantTableDto,
  RestaurantTableQrResponseDto,
  RestaurantTableResponseDto,
  UpdateRestaurantTableDto,
} from './dto/restaurant-table.dto';
import { SearchRestaurantsQueryDto } from './dto/search-restaurants-query.dto';
import { RestaurantsService } from './restaurants.service';
import { ImageFileInterceptor } from '../../common/cloudinary/image-file.interceptor';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { AllowWeb } from '../../common/decorators/client.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MenuResponseDto, PaginatedMenuQueryDto } from '../menu/dto';
import { MenuService } from '../menu/menu.service';

@Controller(['restaurants', 'v1/restaurants'])
@ApiTags('Restaurants')
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly menuService: MenuService,
  ) {}

  /**
   * Get all active restaurants (Public endpoint)
   */
  @Get()
  @AllowWeb()
  @ApiOperation({ summary: 'List active restaurants' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedRestaurantResponseDto })
  async getRestaurants(
    @Query() query: ListRestaurantsQueryDto,
  ): Promise<PaginatedResult<RestaurantResponseDto>> {
    return this.restaurantsService.getRestaurants(query);
  }

  /**
   * Search restaurants by name (optional lat/lng to sort by distance)
   */
  @Get('search')
  @AllowWeb()
  @ApiOperation({ summary: 'Search restaurants by name' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'lat', required: false })
  @ApiQuery({ name: 'lng', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedRestaurantResponseDto })
  async searchRestaurants(
    @Query() query: SearchRestaurantsQueryDto,
  ): Promise<PaginatedResult<RestaurantResponseDto>> {
    return this.restaurantsService.searchRestaurants(
      query.q,
      query.lat !== undefined && query.lng !== undefined
        ? { lat: query.lat, lng: query.lng }
        : undefined,
      query,
    );
  }

  /**
   * Get all restaurants for admin (including inactive)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all restaurants for admin management' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedRestaurantResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true })
  async getAllRestaurantsForAdmin(
    @Query() query: ListRestaurantsQueryDto,
  ): Promise<PaginatedResult<RestaurantResponseDto>> {
    return this.restaurantsService.getAllRestaurantsForAdmin(query);
  }

  /**
   * Find nearby restaurants based on coordinates
   */
  @Get('nearby')
  @AllowWeb()
  @ApiOperation({ summary: 'Find nearby restaurants using coordinates' })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: PaginatedRestaurantResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNearbyRestaurants(
    @Query() query: NearbyRestaurantsDto,
  ): Promise<PaginatedResult<RestaurantResponseDto>> {
    const lat = query.lat ?? query.latitude;
    const lng = query.lng ?? query.longitude;

    if (lat === undefined || lng === undefined) {
      return this.restaurantsService.getRestaurants(query);
    }

    return this.restaurantsService.findNearbyRestaurants({
      lat,
      lng,
      radiusKm: query.radiusKm ?? 10,
      limit: query.limit ?? 20,
      offset: query.offset ?? 0,
    });
  }

  /**
   * Create a new restaurant (Admin only)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new restaurant (Admin only)' })
  @ApiCreatedResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, badRequest: true })
  async createRestaurant(@Body() data: CreateRestaurantDto): Promise<RestaurantResponseDto> {
    return this.restaurantsService.createRestaurant(data);
  }

  /**
   * Update restaurant (Admin only)
   */
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update restaurant details (Admin/Manager only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, badRequest: true, notFound: true })
  async updateRestaurant(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateRestaurantDto,
  ): Promise<RestaurantResponseDto> {
    return this.restaurantsService.updateRestaurant(id, data);
  }

  @Post(':id/image')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @UseInterceptors(ImageFileInterceptor('image'))
  @ApiOperation({ summary: 'Upload restaurant image to Cloudinary' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, badRequest: true, notFound: true })
  async uploadRestaurantImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<RestaurantResponseDto> {
    if (!file) {
      throw new BadRequestException('Restaurant image is required');
    }

    return this.restaurantsService.uploadRestaurantImage(id, file);
  }

  /**
   * Delete restaurant (Admin only)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete restaurant (Admin only)' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ schema: { example: { message: 'Restaurant deleted successfully' } } })
  @ApiStandardErrorResponses({ unauthorized: true, badRequest: true, notFound: true })
  async deleteRestaurant(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.restaurantsService.deleteRestaurant(id);
  }

  @Get(':id/tables')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'List restaurant tables' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: RestaurantTableResponseDto, isArray: true })
  @ApiStandardErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  async getRestaurantTables(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<RestaurantTableResponseDto[]> {
    return this.restaurantsService.getRestaurantTables(id);
  }

  @Post(':id/tables')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new restaurant table' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiCreatedResponse({ type: RestaurantTableResponseDto })
  @ApiStandardErrorResponses({
    unauthorized: true,
    forbidden: true,
    badRequest: true,
    notFound: true,
  })
  async createRestaurantTable(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: CreateRestaurantTableDto,
  ): Promise<RestaurantTableResponseDto> {
    return this.restaurantsService.createRestaurantTable(id, data);
  }

  @Patch(':id/tables/:tableId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Update restaurant table details' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'tableId', type: Number, example: 2 })
  @ApiOkResponse({ type: RestaurantTableResponseDto })
  @ApiStandardErrorResponses({
    unauthorized: true,
    forbidden: true,
    badRequest: true,
    notFound: true,
  })
  async updateRestaurantTable(
    @Param('id', ParseIntPipe) id: number,
    @Param('tableId', ParseIntPipe) tableId: number,
    @Body() data: UpdateRestaurantTableDto,
  ): Promise<RestaurantTableResponseDto> {
    return this.restaurantsService.updateRestaurantTable(id, tableId, data);
  }

  @Delete(':id/tables/:tableId')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Delete restaurant table' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'tableId', type: Number, example: 2 })
  @ApiOkResponse({ schema: { example: { message: 'Table deleted successfully' } } })
  @ApiStandardErrorResponses({
    unauthorized: true,
    forbidden: true,
    badRequest: true,
    notFound: true,
  })
  async deleteRestaurantTable(
    @Param('id', ParseIntPipe) id: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<{ message: string }> {
    return this.restaurantsService.deleteRestaurantTable(id, tableId);
  }

  @Get(':id/tables/:tableId/qr')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get restaurant table QR destination URL' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'tableId', type: Number, example: 2 })
  @ApiOkResponse({ type: RestaurantTableQrResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  async getRestaurantTableQr(
    @Param('id', ParseIntPipe) id: number,
    @Param('tableId', ParseIntPipe) tableId: number,
  ): Promise<RestaurantTableQrResponseDto> {
    return this.restaurantsService.getRestaurantTableQr(id, tableId);
  }

  @Get(':id/tables/:tableId/qr/download')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Download restaurant table QR code as SVG' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiParam({ name: 'tableId', type: Number, example: 2 })
  @ApiQuery({ name: 'format', required: false, example: 'svg' })
  @ApiProduces('image/svg+xml')
  @ApiStandardErrorResponses({
    unauthorized: true,
    forbidden: true,
    badRequest: true,
    notFound: true,
  })
  async downloadRestaurantTableQr(
    @Param('id', ParseIntPipe) id: number,
    @Param('tableId', ParseIntPipe) tableId: number,
    @Query('format') format = 'svg',
    @Res() response: Response,
  ): Promise<void> {
    if (format !== 'svg') {
      throw new BadRequestException('Only svg format is supported');
    }

    const file = await this.restaurantsService.downloadRestaurantTableQrSvg(id, tableId);
    response.setHeader('Content-Type', file.contentType);
    response.setHeader('Content-Disposition', `attachment; filename="${file.fileName}"`);
    response.send(file.buffer);
  }

  /**
   * Get restaurant menu with delivery quote
   */
  @Get(':id/menu')
  @AllowWeb()
  @ApiOperation({ summary: 'Get restaurant menu with delivery quote for coordinates' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: Number,
    description: 'Category id',
    example: 2,
  })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurantMenu(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: PaginatedMenuQueryDto,
  ): Promise<MenuResponseDto> {
    const hasCoordinates =
      query.lat !== undefined ||
      query.lng !== undefined ||
      query.latitude !== undefined ||
      query.longitude !== undefined;

    if (!hasCoordinates) {
      return this.menuService.getMenuByRestaurant(id, {
        categoryId: query.categoryId,
        limit: query.limit,
        offset: query.offset,
      });
    }

    const { lat, lng } = query.getCoordinates();

    return this.menuService.getMenuByRestaurant(id, {
      coordinates: { lat, lng },
      categoryId: query.categoryId,
      limit: query.limit,
      offset: query.offset,
    });
  }

  /**
   * Get single restaurant by ID
   */
  @Get(':id')
  @AllowWeb()
  @ApiOperation({ summary: 'Get restaurant by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurant(@Param('id', ParseIntPipe) id: number): Promise<RestaurantResponseDto> {
    return this.restaurantsService.getRestaurant(id);
  }
}
