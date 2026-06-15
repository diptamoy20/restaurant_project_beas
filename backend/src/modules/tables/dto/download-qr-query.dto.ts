import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class DownloadQrQueryDto {
  @ApiPropertyOptional({ enum: ['png', 'svg', 'pdf'], default: 'png' })
  @IsOptional()
  @IsIn(['png', 'svg', 'pdf'])
  format?: 'png' | 'svg' | 'pdf';
}
