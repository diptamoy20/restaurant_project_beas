import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { CloudinaryService } from './cloudinary.service';
import { ImageCompressionService } from './image-compression.service';

@Module({
  imports: [ConfigModule],
  providers: [CloudinaryService, ImageCompressionService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
