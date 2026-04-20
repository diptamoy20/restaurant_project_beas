import { Body, Controller, Post } from '@nestjs/common';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentsService } from './payments.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('payments')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async initiatePayment(@Body() payload: InitiatePaymentDto): Promise<any> {
    return this.paymentsService.createPayment(payload);
  }
}
