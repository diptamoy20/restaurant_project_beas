import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import sharp, { Sharp } from 'sharp';

import {
  CompressedImage,
  ImageCompressionFormat,
  ImageCompressionOptions,
} from './cloudinary.types';

const DEFAULT_MAX_INPUT_PIXELS = 20_000_000;

@Injectable()
export class ImageCompressionService {
  private readonly logger = new Logger(ImageCompressionService.name);

  async compress(
    file: Express.Multer.File,
    options: ImageCompressionOptions,
  ): Promise<CompressedImage> {
    if (file.mimetype === 'image/gif') {
      return this.preserveGif(file);
    }

    try {
      const source = sharp(file.buffer, {
        limitInputPixels: DEFAULT_MAX_INPUT_PIXELS,
        failOn: 'warning',
      }).rotate();
      const metadata = await source.metadata();
      const format = this.resolveFormat(file.mimetype);

      if (!metadata.width || !metadata.height || !format) {
        throw new BadRequestException('Uploaded file is not a supported image');
      }

      const resized = source.resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      });
      const compressedBuffer = await this.encode(resized, format, options.quality);
      const compressedMetadata = await sharp(compressedBuffer, {
        limitInputPixels: DEFAULT_MAX_INPUT_PIXELS,
      }).metadata();
      const useCompressed = compressedBuffer.length < file.buffer.length;

      return {
        buffer: useCompressed ? compressedBuffer : file.buffer,
        mimetype: file.mimetype,
        format,
        width: compressedMetadata.width ?? metadata.width,
        height: compressedMetadata.height ?? metadata.height,
        originalBytes: file.buffer.length,
        compressedBytes: useCompressed ? compressedBuffer.length : file.buffer.length,
        wasCompressed: useCompressed,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.warn(`Image compression failed: ${this.errorMessage(error)}`);
      throw new BadRequestException('Uploaded file could not be processed as an image');
    }
  }

  private async encode(
    image: Sharp,
    format: ImageCompressionFormat,
    quality: number,
  ): Promise<Buffer> {
    if (format === 'jpeg') {
      return image.jpeg({ quality, mozjpeg: true }).toBuffer();
    }

    if (format === 'webp') {
      return image.webp({ quality }).toBuffer();
    }

    return image.png({ compressionLevel: 9, adaptiveFiltering: true, palette: true }).toBuffer();
  }

  private preserveGif(file: Express.Multer.File): CompressedImage {
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      format: 'gif',
      width: 0,
      height: 0,
      originalBytes: file.buffer.length,
      compressedBytes: file.buffer.length,
      wasCompressed: false,
    };
  }

  private resolveFormat(mimetype: string): ImageCompressionFormat | null {
    if (mimetype === 'image/jpeg') return 'jpeg';
    if (mimetype === 'image/png') return 'png';
    if (mimetype === 'image/webp') return 'webp';

    return null;
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
