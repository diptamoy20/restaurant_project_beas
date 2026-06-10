import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

@Injectable()
export class QrCodeService {
  constructor(private readonly configService: ConfigService) {}

  buildTableQrUrl(tableToken: string): string {
    const baseUrl = (
      this.configService.get<string>('QR_ORDERING_BASE_URL') ?? 'http://localhost:5175'
    ).replace(/\/$/, '');

    return `${baseUrl}/table/${tableToken}`;
  }

  async renderPng(dataUrl: string): Promise<Buffer> {
    return QRCode.toBuffer(dataUrl, {
      type: 'png',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
  }

  async renderSvg(dataUrl: string): Promise<string> {
    return QRCode.toString(dataUrl, {
      type: 'svg',
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'H',
    });
  }

  async renderPdf(dataUrl: string, label: string): Promise<Buffer> {
    const pngBuffer = await this.renderPng(dataUrl);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(22).text(label, { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text('Scan to order', { align: 'center' });
      doc.moveDown(2);
      doc.image(pngBuffer, {
        fit: [300, 300],
        align: 'center',
      });
      doc.moveDown(2);
      doc.fontSize(10).fillColor('#666666').text(dataUrl, { align: 'center' });
      doc.end();
    });
  }
}
