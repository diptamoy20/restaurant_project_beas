import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ConfirmCodPaymentDto } from './dto/confirm-cod-payment.dto';
import { CreateRazorpayOrderDto } from './dto/create-razorpay-order.dto';
import { RazorpayOrderResponseDto, VerifyPaymentResponseDto } from './dto/payment-response.dto';
import { RecordPaymentFailureDto } from './dto/record-payment-failure.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { PaymentsService } from './payments.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('payments')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
@ApiTags('Payments')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('razorpay/order')
  @ApiOperation({ summary: 'Create Razorpay order for checkout' })
  @ApiBody({ type: CreateRazorpayOrderDto })
  @ApiCreatedResponse({ type: RazorpayOrderResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async createRazorpayOrder(
    @Body() payload: CreateRazorpayOrderDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<RazorpayOrderResponseDto> {
    return this.paymentsService.createRazorpayOrder(payload.orderId, request.user.id);
  }

  @Post('razorpay/verify')
  @ApiOperation({ summary: 'Verify Razorpay signature and mark payment as paid' })
  @ApiBody({ type: VerifyRazorpayPaymentDto })
  @ApiCreatedResponse({ type: VerifyPaymentResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async verifyRazorpayPayment(
    @Body() payload: VerifyRazorpayPaymentDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<VerifyPaymentResponseDto> {
    return this.paymentsService.verifyRazorpayPayment(payload, request.user.id);
  }

  @Post('razorpay/failure')
  @ApiOperation({ summary: 'Persist failed Razorpay payment attempt' })
  @ApiBody({ type: RecordPaymentFailureDto })
  @ApiCreatedResponse({ type: VerifyPaymentResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async recordRazorpayFailure(
    @Body() payload: RecordPaymentFailureDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<VerifyPaymentResponseDto> {
    return this.paymentsService.recordRazorpayFailure(payload, request.user.id);
  }

  @Post('cod/confirm')
  @ApiOperation({ summary: 'Confirm cash on delivery selection for an order' })
  @ApiBody({ type: ConfirmCodPaymentDto })
  @ApiCreatedResponse({ type: VerifyPaymentResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async confirmCodPayment(
    @Body() payload: ConfirmCodPaymentDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<VerifyPaymentResponseDto> {
    return this.paymentsService.confirmCodPayment(payload.orderId, request.user.id);
  }
}
