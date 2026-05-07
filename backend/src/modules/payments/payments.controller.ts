import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
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

  @Post('initiate')
  @ApiOperation({ summary: 'Initiate payment for order' })
  @ApiBody({ type: InitiatePaymentDto })
  @ApiCreatedResponse({ type: PaymentResponseDto })
  @ApiStandardErrorResponses({ badRequest: true })
  async initiatePayment(
    @Body() payload: InitiatePaymentDto,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<PaymentResponseDto> {
    const normalizedPayload = request.user.roles.includes(Role.CUSTOMER)
      ? { ...payload, userId: request.user.id }
      : payload;

    return this.paymentsService.createPayment(normalizedPayload);
  }
}
