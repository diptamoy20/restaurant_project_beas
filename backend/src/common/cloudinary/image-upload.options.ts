import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';

export const DEFAULT_IMAGE_UPLOAD_MAX_MB = 1;
const BYTES_PER_MB = 1024 * 1024;

export const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export function getImageUploadMaxBytes(configService: ConfigService): number {
  const maxMb = configService.get<number>('IMAGE_UPLOAD_MAX_MB') ?? DEFAULT_IMAGE_UPLOAD_MAX_MB;

  return Math.floor(maxMb * BYTES_PER_MB);
}

export function formatImageUploadLimit(maxBytes: number): string {
  const maxMb = maxBytes / BYTES_PER_MB;

  return `${Number.isInteger(maxMb) ? maxMb : maxMb.toFixed(1)}MB`;
}

export function createImageUploadOptions(maxBytes: number): Record<string, unknown> {
  return {
    storage: memoryStorage(),
    limits: {
      fileSize: maxBytes,
    },
    fileFilter: (
      _request: unknown,
      file: Express.Multer.File,
      callback: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (!IMAGE_MIME_TYPES.has(file.mimetype)) {
        callback(new BadRequestException('Only JPG, PNG, WEBP, or GIF images are allowed'), false);
        return;
      }

      callback(null, true);
    },
  };
}
