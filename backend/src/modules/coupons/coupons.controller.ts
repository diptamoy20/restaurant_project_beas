import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CouponsService } from './coupons.service';
import {
  BulkCreateCouponsDto,
  CouponQueryDto,
  CouponResponseDto,
  CreateCouponDto,
  UpdateCouponDto,
} from './dto/coupon.dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginatedResult } from '../../common/dto/pagination.dto';
import { Role } from '../../common/enums/role.enum';

@Controller('admin/coupons')
@ApiTags('Admin Coupons')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN, Role.MANAGER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  @ApiOperation({ summary: 'List coupons with filters' })
  @ApiOkResponse({ type: CouponResponseDto, isArray: true })
  list(@Query() query: CouponQueryDto): Promise<PaginatedResult<CouponResponseDto>> {
    return this.couponsService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get coupon by id' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiStandardErrorResponses({ notFound: true })
  get(@Param('id', ParseIntPipe) id: number): Promise<CouponResponseDto> {
    return this.couponsService.get(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create coupon' })
  @ApiBody({ type: CreateCouponDto })
  @ApiCreatedResponse({ type: CouponResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  create(@Body() payload: CreateCouponDto): Promise<CouponResponseDto> {
    return this.couponsService.create(payload);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create same coupon for multiple restaurants' })
  @ApiBody({ type: BulkCreateCouponsDto })
  @ApiCreatedResponse({ type: CouponResponseDto, isArray: true })
  @ApiStandardErrorResponses({ badRequest: true })
  createBulk(@Body() payload: BulkCreateCouponsDto): Promise<CouponResponseDto[]> {
    return this.couponsService.createBulk(payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update coupon' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateCouponDto })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete coupon or disable it when order history exists' })
  @ApiParam({ name: 'id', type: Number })
  @ApiOkResponse({ type: CouponResponseDto })
  @ApiStandardErrorResponses({ notFound: true })
  remove(@Param('id', ParseIntPipe) id: number): Promise<CouponResponseDto> {
    return this.couponsService.remove(id);
  }
}
