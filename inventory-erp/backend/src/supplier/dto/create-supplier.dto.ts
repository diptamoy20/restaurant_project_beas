import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'SUP-01' })
  @IsString()
  @IsNotEmpty()
  supplierCode!: string;

  @ApiProperty({ example: 'Metro Wholesalers Ltd' })
  @IsString()
  @IsNotEmpty()
  companyName!: string;

  @ApiProperty({ example: 'Rajesh Kumar' })
  @IsString()
  @IsNotEmpty()
  contactPerson!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  mobile!: string;

  @ApiProperty({ example: 'sales@metro.com' })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiPropertyOptional({ example: 'GSTIN123456789' })
  @IsString()
  @IsOptional()
  gstNumber?: string;

  @ApiProperty({ example: '12, Industrial Area, Phase-I, Bangalore' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: 'Net 30' })
  @IsString()
  @IsNotEmpty()
  paymentTerms!: string;

  @ApiPropertyOptional({ example: 500000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  creditLimit?: number;

  @ApiPropertyOptional({ example: 'PO-MET' })
  @IsString()
  @IsOptional()
  poPrefix?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: boolean;
}
