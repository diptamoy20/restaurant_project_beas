import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';

const INVOICE_ORDER_INCLUDE = {
  invoice: true,
  items: {
    include: {
      menuItem: true,
      variant: true,
      addons: true,
    },
  },
  payments: true,
  restaurant: true,
  user: true,
  address: true,
  table: true,
} satisfies Prisma.OrderInclude;

type InvoiceOrder = Prisma.OrderGetPayload<{
  include: typeof INVOICE_ORDER_INCLUDE;
}>;

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getInvoiceForOrder(
    orderId: number,
    requester: AuthenticatedUser,
  ): Promise<InvoiceResponseDto> {
    const order = await this.getAuthorizedOrder(orderId, requester);
    const invoice = await this.ensureInvoice(order);
    const freshOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: INVOICE_ORDER_INCLUDE,
    });

    if (!freshOrder) {
      throw new NotFoundException('Order not found');
    }

    return this.mapInvoice(freshOrder, invoice);
  }

  async downloadInvoicePdf(
    orderId: number,
    requester: AuthenticatedUser,
  ): Promise<{
    fileName: string;
    contentType: string;
    buffer: Buffer;
  }> {
    const invoice = await this.getInvoiceForOrder(orderId, requester);

    if (!invoice.canDownload) {
      throw new BadRequestException(invoice.unavailableReason ?? 'Invoice is not available yet');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: INVOICE_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      fileName: `${invoice.invoiceNumber}.pdf`,
      contentType: 'application/pdf',
      buffer: this.renderPdf(order, invoice),
    };
  }

  async markInvoicePaid(orderId: number, paidAt = new Date()): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: INVOICE_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const invoice = await this.ensureInvoice(order);
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'AVAILABLE',
        paidAt,
        issuedAt: invoice.issuedAt ?? paidAt,
      },
    });
  }

  private async getAuthorizedOrder(
    orderId: number,
    requester: AuthenticatedUser,
  ): Promise<InvoiceOrder> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: INVOICE_ORDER_INCLUDE,
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (requester.role === Role.CUSTOMER && order.userId !== requester.id) {
      throw new ForbiddenException('You do not have permission to access this invoice');
    }

    return order;
  }

  private async ensureInvoice(order: InvoiceOrder): Promise<NonNullable<InvoiceOrder['invoice']>> {
    const status = this.isInvoiceDownloadable(order) ? 'AVAILABLE' : 'LOCKED';
    const now = new Date();

    if (order.invoice) {
      if (status === 'AVAILABLE' && order.invoice.status !== 'AVAILABLE') {
        return this.prisma.invoice.update({
          where: { id: order.invoice.id },
          data: {
            status,
            issuedAt: order.invoice.issuedAt ?? now,
            paidAt: order.invoice.paidAt ?? now,
          },
        });
      }

      return order.invoice;
    }

    return this.prisma.invoice.create({
      data: {
        orderId: order.id,
        invoiceNumber: this.buildInvoiceNumber(order),
        status,
        issuedAt: status === 'AVAILABLE' ? now : null,
        paidAt: status === 'AVAILABLE' ? now : null,
      },
    });
  }

  private mapInvoice(
    order: InvoiceOrder,
    invoice: NonNullable<InvoiceOrder['invoice']>,
  ): InvoiceResponseDto {
    const canDownload = this.isInvoiceDownloadable(order);

    return {
      id: invoice.id,
      orderId: order.id,
      invoiceNumber: invoice.invoiceNumber,
      status: canDownload ? 'AVAILABLE' : 'LOCKED',
      canDownload,
      unavailableReason: canDownload ? null : this.getUnavailableReason(order),
      issuedAt: invoice.issuedAt,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      orderStatus: order.status,
      subtotalAmount: order.subtotalAmount,
      discountAmount: order.discountAmount ?? 0,
      taxAmount: order.taxAmount,
      deliveryCharge: order.deliveryCharge,
      packagingCharge: order.packagingCharge,
      tipAmount: order.tipAmount,
      finalAmount: order.finalAmount,
      items: order.items.map((item) => ({
        name: item.menuItem?.name ?? 'Menu item',
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.totalPrice,
      })),
    };
  }

  private isInvoiceDownloadable(order: InvoiceOrder): boolean {
    return order.paymentStatus === 'PAID';
  }

  private getUnavailableReason(order: InvoiceOrder): string {
    if (order.paymentMethod === 'COD') {
      return 'Invoice will be available after admin confirms physical payment.';
    }

    return 'Invoice will be available after successful payment.';
  }

  private buildInvoiceNumber(order: Pick<InvoiceOrder, 'id' | 'createdAt'>): string {
    const date = order.createdAt;
    const stamp = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, '0'),
      String(date.getUTCDate()).padStart(2, '0'),
    ].join('');

    return `INV-${stamp}-${String(order.id).padStart(6, '0')}`;
  }

  private formatMoney(value: number): string {
    return `Rs. ${Number(value ?? 0).toFixed(2)}`;
  }

  private formatDate(value: Date): string {
    const day = String(value.getDate()).padStart(2, '0');
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const year = value.getFullYear();

    return `${day}/${month}/${year}`;
  }

  private escapePdfText(value: unknown): string {
    return String(value ?? '')
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');
  }

  private renderPdf(order: InvoiceOrder, invoice: InvoiceResponseDto): Buffer {
    const lines = [
      'RESTAURANT INVOICE',
      `Invoice ID: ${invoice.invoiceNumber}`,
      `Invoice Date: ${this.formatDate(invoice.issuedAt ?? new Date())}`,
      `Order ID: ${order.orderNumber}`,
      `Order Date: ${this.formatDate(order.createdAt)}`,
      `Status: ${order.status}`,
      '',
      `Restaurant: ${order.restaurant.name}`,
      `Restaurant Address: ${order.restaurant.address}${order.restaurant.city ? `, ${order.restaurant.city}` : ''}`,
      `Customer: ${order.user?.name ?? 'Guest Customer'}`,
      `Email: ${order.user?.email ?? '-'}`,
      `Phone: ${order.user?.phone ?? '-'}`,
      `Payment: ${order.paymentMethod ?? '-'} / ${order.paymentStatus}`,
      '',
      'Items',
      ...order.items.map(
        (item) =>
          `${item.menuItem?.name ?? 'Menu item'} x ${item.quantity} @ ${this.formatMoney(item.price)} = ${this.formatMoney(item.totalPrice)}`,
      ),
      '',
      `Subtotal: ${this.formatMoney(order.subtotalAmount)}`,
      `Discount: -${this.formatMoney(order.discountAmount ?? 0)}`,
      `Tax: ${this.formatMoney(order.taxAmount)}`,
      `Delivery: ${this.formatMoney(order.deliveryCharge)}`,
      `Packaging: ${this.formatMoney(order.packagingCharge)}`,
      `Tip: ${this.formatMoney(order.tipAmount)}`,
      `Total: ${this.formatMoney(order.finalAmount)}`,
      '',
      'Thank you for your order.',
    ];

    const content = [
      'BT',
      '/F1 18 Tf',
      '50 790 Td',
      ...lines.flatMap((line, index) => [
        index === 0 ? '' : '0 -18 Td',
        `${index === 0 ? '/F1 18 Tf' : index === 14 ? '/F1 13 Tf' : '/F1 11 Tf'} (${this.escapePdfText(line)}) Tj`,
      ]),
      'ET',
    ]
      .filter(Boolean)
      .join('\n');

    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
      `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets = [0];

    objects.forEach((object, index) => {
      offsets.push(Buffer.byteLength(pdf));
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });

    const xrefOffset = Buffer.byteLength(pdf);
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    return Buffer.from(pdf, 'utf8');
  }
}
