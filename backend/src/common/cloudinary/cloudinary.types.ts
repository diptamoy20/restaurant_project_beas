export type CloudinaryImageFolder = 'users/profile-images' | 'restaurants' | 'menu-items';

export type ImageCompressionFormat = 'jpeg' | 'png' | 'webp' | 'gif';

export type ImageCompressionOptions = {
  maxWidth: number;
  maxHeight: number;
  quality: number;
};

export type CompressedImage = {
  buffer: Buffer;
  mimetype: string;
  format: ImageCompressionFormat;
  width: number;
  height: number;
  originalBytes: number;
  compressedBytes: number;
  wasCompressed: boolean;
};

export type CloudinaryImageUploadResult = {
  secureUrl: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  resourceType: string;
};
