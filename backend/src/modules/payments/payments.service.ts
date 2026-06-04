import crypto from 'crypto';

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Order, Prisma } from '@prisma/client';
import Razorpay from 'razorpay';

import { RazorpayOrderResponseDto, VerifyPaymentResponseDto } from './dto/payment-response.dto';
import { RecordPaymentFailureDto } from './dto/record-payment-failure.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import {
  COD_PAYMENT_METHODS,
  isCodPaymentMethod,
  PAYMENT_STATUS,
} from '../../common/constants/payment';
import { PrismaService } from '../../prisma/prisma.service';
import { InvoicesService } from '../invoices/invoices.service';

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly invoicesService: InvoicesService,
  ) {
    this.razorpay = new Razorpay({
      key_id: this.configService.getOrThrow<string>('RAZORPAY_KEY_ID'),
      key_secret: this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'),
    });
  }

  async createRazorpayOrder(orderId: number, userId: number): Promise<RazorpayOrderResponseDto> {
    const order = await this.getOrderForUser(orderId, userId);
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order payment is already completed');
    }

    const amountInPaise = Math.round(order.finalAmount * 100);
    if (amountInPaise <= 0) {
      throw new BadRequestException('Order amount must be greater than 0');
    }

    try {
      const razorpayOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          orderId: String(order.id),
          userId: String(userId),
        },
      });

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PENDING',
            paymentMethod: 'RAZORPAY',
            razorpayOrderId: razorpayOrder.id,
            paymentFailureReason: null,
            razorpayDetails: {
              razorpayOrderStatus: razorpayOrder.status,
              razorpayOrderAttempt: razorpayOrder.attempts,
            },
          },
        }),
        this.prisma.payment.create({
          data: {
            orderId: order.id,
            userId: order.userId,
            transactionId: razorpayOrder.id,
            amount: order.finalAmount,
            status: 'PENDING',
            method: 'RAZORPAY',
          },
        }),
      ]);

      return {
        orderId: order.id,
        razorpayOrderId: razorpayOrder.id,
        amount: Number(razorpayOrder.amount),
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
      };
    } catch {
      throw new BadRequestException('Unable to create Razorpay order');
    }
  }

  async verifyRazorpayPayment(
    payload: VerifyRazorpayPaymentDto,
    userId: number,
  ): Promise<VerifyPaymentResponseDto> {
    const order = await this.getOrderForUser(payload.orderId, userId);
    if (order.razorpayOrderId !== payload.razorpayOrderId) {
      throw new BadRequestException('Razorpay order id mismatch');
    }

    const generatedSignature = crypto
      .createHmac('sha256', this.configService.getOrThrow<string>('RAZORPAY_KEY_SECRET'))
      .update(`${payload.razorpayOrderId}|${payload.razorpayPaymentId}`)
      .digest('hex');

    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(payload.razorpaySignature),
    );

    if (!isValidSignature) {
      await this.recordFailure(
        order.id,
        order.userId,
        payload.razorpayOrderId,
        order.finalAmount,
        'Signature mismatch',
      );
      throw new BadRequestException('Invalid Razorpay signature');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paymentMethod: 'RAZORPAY',
          razorpayPaymentId: payload.razorpayPaymentId,
          razorpaySignature: payload.razorpaySignature,
          paymentFailureReason: null,
          razorpayDetails: {
            verifiedAt: new Date().toISOString(),
          },
        },
      }),
      this.prisma.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          transactionId: payload.razorpayPaymentId,
          amount: order.finalAmount,
          status: 'SUCCESS',
          method: 'RAZORPAY',
        },
      }),
    ]);
    await this.invoicesService.markInvoicePaid(order.id);

    return {
      orderId: order.id,
      paymentStatus: 'PAID',
      paymentMethod: 'RAZORPAY',
      message: 'Payment verified successfully',
    };
  }

  async recordRazorpayFailure(
    payload: RecordPaymentFailureDto,
    userId: number,
  ): Promise<VerifyPaymentResponseDto> {
    const order = await this.getOrderForUser(payload.orderId, userId);
    await this.recordFailure(
      order.id,
      order.userId,
      payload.razorpayOrderId,
      order.finalAmount,
      payload.reason,
    );

    return {
      orderId: order.id,
      paymentStatus: 'FAILED',
      paymentMethod: 'RAZORPAY',
      message: 'Payment failure recorded',
    };
  }

  async confirmCodPayment(orderId: number, userId: number): Promise<VerifyPaymentResponseDto> {
    const order = await this.getOrderForUser(orderId, userId);
    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException('Order payment is already completed');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PENDING',
          paymentMethod: 'COD',
          paymentFailureReason: null,
        },
      }),
      this.prisma.payment.create({
        data: {
          orderId: order.id,
          userId: order.userId,
          transactionId: null,
          amount: order.finalAmount,
          status: 'PENDING',
          method: 'COD',
        },
      }),
    ]);

    return {
      orderId: order.id,
      paymentStatus: 'PENDING',
      paymentMethod: 'COD',
      message: 'Cash on delivery selected',
    };
  }

  async confirmCodPaymentByAdmin(orderId: number): Promise<VerifyPaymentResponseDto> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!isCodPaymentMethod(order.paymentMethod)) {
      throw new BadRequestException('Only COD orders can be confirmed by admin');
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      throw new BadRequestException('Order payment is already completed');
    }

    await this.prisma.$transaction(async (transaction) => {
      await this.settleCodPaymentInTransaction(transaction, order);
    });
    await this.finalizeCodPaymentAfterDelivery(order.id);

    return {
      orderId: order.id,
      paymentStatus: 'PAID',
      paymentMethod: 'COD',
      message: 'COD payment confirmed',
    };
  }

  /**
   * Merges COD paid fields into a pending order update (single order.update in caller).
   */
  async prepareCodPaidOrderUpdate(
    transaction: Prisma.TransactionClient,
    order: Pick<
      Order,
      'id' | 'orderNumber' | 'finalAmount' | 'userId' | 'paymentMethod' | 'paymentStatus'
    >,
    orderUpdate: Prisma.OrderUpdateInput,
  ): Promise<boolean> {
    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return false;
    }

    const codMethod = await this.resolveCodPaymentMethod(transaction, order);
    if (!codMethod) {
      return false;
    }

    orderUpdate.paymentStatus = PAYMENT_STATUS.PAID;
    orderUpdate.paymentMethod = codMethod;
    orderUpdate.paymentFailureReason = null;

    return true;
  }

  async syncCodPaymentRecords(
    transaction: Prisma.TransactionClient,
    order: Pick<Order, 'id' | 'orderNumber' | 'finalAmount' | 'userId'>,
  ): Promise<void> {
    const existingPayment = await transaction.payment.findFirst({
      where: {
        orderId: order.id,
        method: { in: [...COD_PAYMENT_METHODS] },
      },
      orderBy: { id: 'desc' },
    });

    if (existingPayment) {
      await transaction.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: 'SUCCESS',
          transactionId: existingPayment.transactionId ?? `COD-${order.orderNumber}`,
          amount: order.finalAmount,
          method: 'COD',
        },
      });
      return;
    }

    await transaction.payment.create({
      data: {
        orderId: order.id,
        userId: order.userId,
        transactionId: `COD-${order.orderNumber}`,
        amount: order.finalAmount,
        status: 'SUCCESS',
        method: 'COD',
      },
    });
  }

  async finalizeCodPaymentAfterDelivery(orderId: number): Promise<void> {
    await this.invoicesService.markInvoicePaid(orderId);
  }

  private async settleCodPaymentInTransaction(
    transaction: Prisma.TransactionClient,
    order: Pick<
      Order,
      'id' | 'orderNumber' | 'finalAmount' | 'userId' | 'paymentMethod' | 'paymentStatus'
    >,
  ): Promise<boolean> {
    const orderUpdate: Prisma.OrderUpdateInput = {};
    const shouldSettle = await this.prepareCodPaidOrderUpdate(transaction, order, orderUpdate);

    if (!shouldSettle) {
      return false;
    }

    await transaction.order.update({
      where: { id: order.id },
      data: orderUpdate,
    });
    await this.syncCodPaymentRecords(transaction, order);

    return true;
  }

  private async resolveCodPaymentMethod(
    transaction: Prisma.TransactionClient,
    order: Pick<Order, 'id' | 'paymentMethod'>,
  ): Promise<'COD' | null> {
    if (isCodPaymentMethod(order.paymentMethod)) {
      return 'COD';
    }

    const codPayment = await transaction.payment.findFirst({
      where: {
        orderId: order.id,
        method: { in: [...COD_PAYMENT_METHODS] },
      },
      orderBy: { id: 'desc' },
      select: { method: true },
    });

    return codPayment && isCodPaymentMethod(codPayment.method) ? 'COD' : null;
  }

  private async getOrderForUser(orderId: number, userId: number): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new BadRequestException('You are not allowed to pay for this order');
    }
    return order;
  }

  private async recordFailure(
    orderId: number,
    userId: number | null,
    razorpayOrderId: string,
    amount: number,
    reason?: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'FAILED',
          paymentMethod: 'RAZORPAY',
          razorpayOrderId,
          paymentFailureReason: reason ?? 'Payment failed',
          paymentRetryCount: {
            increment: 1,
          },
        },
      }),
      this.prisma.payment.create({
        data: {
          orderId,
          userId,
          transactionId: razorpayOrderId,
          amount,
          status: 'FAILED',
          method: 'RAZORPAY',
        },
      }),
    ]);
  }
}
