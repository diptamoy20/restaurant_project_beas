import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CartService } from './cart.service';
import { CartItemResponseDto } from './dto/cart-item-response.dto';
import { CreateCartItemDto } from './dto/create-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';
import { CartResponseDto } from './dto/cart-response.dto';

@Controller('carts')
@ApiTags('Cart')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Roles(Role.CUSTOMER)
  @Get()
  @ApiOperation({ summary: 'Get all cart items for authenticated user' })
  // @ApiOkResponse({ type: CartItemResponseDto, isArray: true })
  //   @ApiOkResponse({
  //   description:
  //     'Returns grouped cart response',
  // })
  @ApiOkResponse({
    type: CartResponseDto,
  })
  async getCart(@Req() request: { user: AuthenticatedUser }) {
    return this.cartService.getCart(request.user.id);
  }

  @Roles(Role.CUSTOMER)
  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiBody({ type: CreateCartItemDto })
  @ApiCreatedResponse({ type: CartItemResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  addToCart(
    @Body() payload: CreateCartItemDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<CartItemResponseDto> {
    return this.cartService.addToCart(request.user.id, payload);
  }

  @Roles(Role.CUSTOMER)
  @Put(':menuItemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  @ApiParam({ name: 'menuItemId', type: Number, example: 1 })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiOkResponse({ type: CartItemResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  updateCartItem(
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
    @Body() payload: UpdateCartItemDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<CartItemResponseDto> {
    return this.cartService.updateCartItem(request.user.id, menuItemId, payload);
  }

  @Roles(Role.CUSTOMER)
  @Delete(':menuItemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'menuItemId', type: Number, example: 1 })
  @ApiNoContentResponse()
  @ApiStandardErrorResponses({ notFound: true })
  removeFromCart(
    @Param('menuItemId', ParseIntPipe) menuItemId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<void> {
    return this.cartService.removeFromCart(request.user.id, menuItemId);
  }

  @Roles(Role.CUSTOMER)
  @Delete()
  @ApiOperation({ summary: 'Clear entire cart' })
  @ApiNoContentResponse()
  clearCart(@Req() request: { user: AuthenticatedUser }): Promise<void> {
    return this.cartService.clearCart(request.user.id);
  }
}
