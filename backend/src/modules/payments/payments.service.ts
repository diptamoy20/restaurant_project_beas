import { Injectable } from '@nestjs/common';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(payload: InitiatePaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.prisma.payment.create({
      data: {
        orderId: payload.orderId,
        userId: payload.userId,
        transactionId: payload.transactionId,
        amount: payload.amount,
        status: payload.status,
        method: payload.method,
      },
    });

    return {
      id: payment.id,
      orderId: payment.orderId,
      userId: payment.userId,
      transactionId: payment.transactionId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
    };
  }
}
