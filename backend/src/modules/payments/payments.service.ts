import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';
import Razorpay from 'razorpay';

import { RecordPaymentFailureDto } from './dto/record-payment-failure.dto';
import { RazorpayOrderResponseDto, VerifyPaymentResponseDto } from './dto/payment-response.dto';
import { VerifyRazorpayPaymentDto } from './dto/verify-razorpay-payment.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

  private async getOrderForUser(orderId: number, userId: number) {
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
    userId: number,
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
