declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer?: Buffer;
    }
  }
}

declare module 'multer' {
  type StorageCallback = (error: Error | null, value: string) => void;

  type DiskStorageOptions = {
    destination: (request: unknown, file: Express.Multer.File, callback: StorageCallback) => void;
    filename: (request: unknown, file: Express.Multer.File, callback: StorageCallback) => void;
  };

  export function diskStorage(options: DiskStorageOptions): unknown;
}
