import { PassThrough } from 'stream';

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadApiOptions, UploadApiResponse, v2 as cloudinary } from 'cloudinary';

import {
  CloudinaryImageFolder,
  CloudinaryImageUploadResult,
  ImageCompressionOptions,
} from './cloudinary.types';
import { ImageCompressionService } from './image-compression.service';
import {
  IMAGE_MIME_TYPES,
  formatImageUploadLimit,
  getImageUploadMaxBytes,
} from './image-upload.options';

const IMAGE_COMPRESSION_BY_FOLDER: Record<CloudinaryImageFolder, ImageCompressionOptions> = {
  'users/profile-images': {
    maxWidth: 512,
    maxHeight: 512,
    quality: 82,
  },
  restaurants: {
    maxWidth: 1600,
    maxHeight: 1200,
    quality: 82,
  },
  'menu-items': {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 82,
  },
};

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly imageCompressionService: ImageCompressionService,
  ) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: CloudinaryImageFolder,
  ): Promise<CloudinaryImageUploadResult> {
    this.ensureConfigured();

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Uploaded image buffer is missing');
    }

    this.validateImageFile(file);

    const compressedImage = await this.imageCompressionService.compress(
      file,
      IMAGE_COMPRESSION_BY_FOLDER[folder],
    );
    const result = await this.uploadBuffer(compressedImage.buffer, {
      folder,
      resource_type: 'image',
      unique_filename: true,
      overwrite: false,
    });

    return {
      secureUrl: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      resourceType: result.resource_type,
    };
  }

  async deleteImage(publicId: string | null | undefined): Promise<boolean> {
    if (!publicId) {
      return false;
    }

    if (!this.isConfigured()) {
      this.logger.warn(`Cloudinary delete skipped for ${publicId}: Cloudinary is not configured`);
      return false;
    }

    try {
      const result = (await cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
      })) as { result?: string };

      return result.result === 'ok' || result.result === 'not found';
    } catch (error) {
      this.logger.warn(`Cloudinary delete failed for ${publicId}: ${this.errorMessage(error)}`);
      return false;
    }
  }

  private uploadBuffer(buffer: Buffer, options: UploadApiOptions): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error || !result) {
          reject(
            new InternalServerErrorException(
              `Cloudinary upload failed: ${this.errorMessage(error)}`,
            ),
          );
          return;
        }

        resolve(result);
      });

      const bufferStream = new PassThrough();

      uploadStream.on('error', (error) => {
        reject(
          new InternalServerErrorException(`Cloudinary upload failed: ${this.errorMessage(error)}`),
        );
      });
      bufferStream.end(buffer);
      bufferStream.pipe(uploadStream);
    });
  }

  private validateImageFile(file: Express.Multer.File): void {
    if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Only JPG, PNG, WEBP, or GIF images are allowed');
    }

    const maxBytes = getImageUploadMaxBytes(this.configService);

    if (file.buffer.length > maxBytes) {
      throw new BadRequestException(`Image must be ${formatImageUploadLimit(maxBytes)} or smaller`);
    }

    if (!this.matchesImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('Uploaded file content does not match image type');
    }
  }

  private matchesImageSignature(buffer: Buffer, mimetype: string): boolean {
    if (mimetype === 'image/jpeg') {
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }

    if (mimetype === 'image/png') {
      return (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }

    if (mimetype === 'image/gif') {
      const signature = buffer.subarray(0, 6).toString('ascii');

      return signature === 'GIF87a' || signature === 'GIF89a';
    }

    if (mimetype === 'image/webp') {
      return (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }

    return false;
  }

  private ensureConfigured(): void {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException('Cloudinary is not configured');
    }
  }

  private isConfigured(): boolean {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    return Boolean(cloudName && apiKey && apiSecret);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
  }
}
