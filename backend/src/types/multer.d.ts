declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination?: string;
      filename?: string;
      path?: string;
      buffer: Buffer;
    }
  }
}

declare module 'multer' {
  type StorageCallback = (error: Error | null, value: string) => void;
  type FileFilterCallback = (error: Error | null, acceptFile: boolean) => void;

  type DiskStorageOptions = {
    destination: (request: unknown, file: Express.Multer.File, callback: StorageCallback) => void;
    filename: (request: unknown, file: Express.Multer.File, callback: StorageCallback) => void;
  };

  type MulterOptions = {
    storage?: unknown;
    limits?: {
      fileSize?: number;
    };
    fileFilter?: (
      request: unknown,
      file: Express.Multer.File,
      callback: FileFilterCallback,
    ) => void;
  };

  type MulterInstance = {
    single(fieldName: string): unknown;
  };

  export function diskStorage(options: DiskStorageOptions): unknown;
  export function memoryStorage(): unknown;
  export default function multer(options?: MulterOptions): MulterInstance;
}
