import { Body, Controller, Get, Post, Query, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import { PosCouponsQueryDto } from './dto/pos-coupons-query.dto';
import { PosCouponsResponseDto } from './dto/pos-coupons-response.dto';
import { PosCreateOrderDto } from './dto/pos-create-order.dto';
import { PosDashboardResponseDto } from './dto/pos-dashboard.dto';
import { PosMenuQueryDto } from './dto/pos-menu-query.dto';
import { PosMenuResponseDto } from './dto/pos-menu-response.dto';
import { PosOrderListQueryDto } from './dto/pos-order-list-query.dto';
import { PosOrderListResponseDto } from './dto/pos-order-list-response.dto';
import { PosOrderResponseDto } from './dto/pos-order-response.dto';
import { PosService } from './pos.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('POS')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'Get POS dashboard metrics' })
  @ApiOkResponse({ type: PosDashboardResponseDto })
  async getDashboard(@Request() req: { user: AuthenticatedUser }): Promise<{
    success: boolean;
    message: string;
    data: PosDashboardResponseDto;
  }> {
    const data = await this.posService.getDashboard(req.user);
    return {
      success: true,
      message: 'POS dashboard fetched successfully',
      data,
    };
  }

  @Get('coupons')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'List coupons available for the POS staff restaurant' })
  @ApiQuery({
    name: 'subtotalAmount',
    required: false,
    type: Number,
    description: 'Current cart subtotal for estimating discount amounts',
    example: 450,
  })
  @ApiOkResponse({ type: PosCouponsResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiForbiddenResponse({ description: 'User is inactive or not associated with a restaurant' })
  async getCoupons(
    @Request() req: { user: AuthenticatedUser },
    @Query() query: PosCouponsQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PosCouponsResponseDto;
  }> {
    const coupons = await this.posService.getPosCoupons(req.user, query);
    return {
      success: true,
      message: 'POS coupons fetched successfully',
      data: { coupons },
    };
  }

  @Get('menu')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'Get POS menu for the authenticated staff member restaurant' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search menu items by name (case-insensitive, partial match)',
    example: 'burger',
  })
  @ApiOkResponse({ type: PosMenuResponseDto })
  @ApiNotFoundResponse({ description: 'Restaurant not found' })
  @ApiForbiddenResponse({ description: 'User is inactive or not associated with a restaurant' })
  async getMenu(
    @Request() req: { user: AuthenticatedUser },
    @Query() query: PosMenuQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PosMenuResponseDto;
  }> {
    const data = await this.posService.getPosMenu(req.user, query);
    return {
      success: true,
      message: 'POS menu fetched successfully',
      data,
    };
  }

  @Post('orders')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'Create a POS order' })
  @ApiBody({ type: PosCreateOrderDto })
  @ApiCreatedResponse({ type: PosOrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  async createOrder(
    @Request() req: { user: AuthenticatedUser },
    @Body() dto: PosCreateOrderDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PosOrderResponseDto;
  }> {
    const data = await this.posService.createPosOrder(req.user, dto);
    return {
      success: true,
      message: 'POS order created successfully',
      data,
    };
  }

  @Get('orders')
  @Roles(Role.ADMIN, Role.MANAGER, Role.POS_STAFF)
  @ApiOperation({ summary: 'List POS orders for the authenticated staff restaurant' })
  @ApiOkResponse({ type: PosOrderListResponseDto })
  @ApiStandardErrorResponses({ unauthorized: true, forbidden: true, notFound: true })
  async getOrders(
    @Request() req: { user: AuthenticatedUser },
    @Query() query: PosOrderListQueryDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: PosOrderListResponseDto;
  }> {
    const data = await this.posService.getPosOrders(req.user, query);
    return {
      success: true,
      message: 'POS orders fetched successfully',
      data,
    };
  }
}
