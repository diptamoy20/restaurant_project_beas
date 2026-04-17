import { Body, Controller, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';

@Controller('payments')
@Roles(Role.ADMIN, Role.MANAGER, Role.CUSTOMER)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  initiatePayment(@Body() payload: InitiatePaymentDto) {
    return this.paymentsService.createPayment(payload);
  }
}
