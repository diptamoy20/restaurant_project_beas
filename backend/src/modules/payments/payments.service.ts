import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPayment(payload: InitiatePaymentDto): Promise<PaymentResponseDto> {
    const payment = await this.prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUnique({
        where: { id: payload.orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.userId !== payload.userId) {
        throw new BadRequestException('Payment user does not match the order owner');
      }

      if (Math.abs(order.finalAmount - payload.amount) > 0.01) {
        throw new BadRequestException('Payment amount does not match the order total');
      }

      const createdPayment = await transaction.payment.create({
        data: {
          orderId: payload.orderId,
          userId: payload.userId,
          transactionId: payload.transactionId,
          amount: payload.amount,
          status: payload.status,
          method: payload.method,
        },
      });

      await transaction.order.update({
        where: { id: payload.orderId },
        data: {
          paymentStatus:
            payload.status === 'SUCCESS' ? 'PAID' : payload.status === 'FAILED' ? 'FAILED' : 'PENDING',
        },
      });

      return createdPayment;
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
