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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags, ApiCreatedResponse } from '@nestjs/swagger';

import { NearbyRestaurantsDto } from './dto/nearby-restaurants.dto';
import { RestaurantResponseDto } from './dto/restaurant-response.dto';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/create-update-restaurant.dto';
import { RestaurantsService } from './restaurants.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CoordinatesQueryDto } from '../location/dto/coordinates-query.dto';
import { MenuResponseDto } from '../menu/dto';
import { MenuService } from '../menu/menu.service';
import { RolesGuard } from '../../common/guards/roles.guard';

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
  @Public()
  @ApiOperation({ summary: 'List active restaurants' })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  async getRestaurants(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.getRestaurants();
  }

  /**
   * Get all restaurants for admin (including inactive)
   */
  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.MANAGER)
  @ApiOperation({ summary: 'Get all restaurants for admin management' })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  @ApiStandardErrorResponses({ unauthorized: true })
  async getAllRestaurantsForAdmin(): Promise<RestaurantResponseDto[]> {
    return this.restaurantsService.getAllRestaurantsForAdmin();
  }

  /**
   * Find nearby restaurants based on coordinates
   */
  @Get('nearby')
  @Public()
  @ApiOperation({ summary: 'Find nearby restaurants using coordinates' })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: 88.3639 })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiOkResponse({ type: RestaurantResponseDto, isArray: true })
  @ApiStandardErrorResponses({ badRequest: true })
  async getNearbyRestaurants(
    @Query() query: NearbyRestaurantsDto,
  ): Promise<RestaurantResponseDto[]> {
    const { lat, lng } = query.getCoordinates();

    return this.restaurantsService.findNearbyRestaurants({
      lat,
      lng,
      radiusKm: query.radiusKm ?? 10,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
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

  /**
   * Get restaurant menu with delivery quote
   */
  @Get(':id/menu')
  @Public()
  @ApiOperation({ summary: 'Get restaurant menu with delivery quote for coordinates' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiQuery({ name: 'lat', required: false, type: Number, example: 22.5726 })
  @ApiQuery({ name: 'lng', required: false, type: Number, example: 88.3639 })
  @ApiOkResponse({ type: MenuResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurantMenu(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: CoordinatesQueryDto,
  ): Promise<MenuResponseDto> {
    const hasCoordinates =
      query.lat !== undefined ||
      query.lng !== undefined ||
      query.latitude !== undefined ||
      query.longitude !== undefined;

    if (!hasCoordinates) {
      return this.menuService.getMenuByRestaurant(id);
    }

    const { lat, lng } = query.getCoordinates();

    return this.menuService.getMenuByRestaurant(id, { lat, lng });
  }

  /**
   * Get single restaurant by ID
   */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get restaurant by id' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({ type: RestaurantResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async getRestaurant(@Param('id', ParseIntPipe) id: number): Promise<RestaurantResponseDto> {
    return this.restaurantsService.getRestaurant(id);
  }
}
