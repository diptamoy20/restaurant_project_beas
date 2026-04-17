import { Injectable } from '@nestjs/common';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  createPayment(payload: InitiatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        orderId: payload.orderId,
        userId: payload.userId,
        transactionId: payload.transactionId,
        amount: payload.amount,
        status: payload.status,
        method: payload.method,
      },
    });
  }
}
