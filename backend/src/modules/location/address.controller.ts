import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AddressValidationDto } from './dto/address-validation.dto';
import { AddressValidationResponseDto } from './dto/location-response.dto';
import { LocationService } from './location.service';
import { AllowWeb } from '../../common/decorators/client.decorator';

@Controller(['address', 'v1/address'])
@ApiTags('Address')
export class AddressController {
  constructor(private readonly locationService: LocationService) {}

  @Post('validate')
  @AllowWeb()
  @ApiOperation({ summary: 'Validate delivery availability for GPS coordinates' })
  @ApiOkResponse({ type: AddressValidationResponseDto })
  validateAddress(@Body() body: AddressValidationDto): Promise<AddressValidationResponseDto> {
    return this.locationService.validateAddress(body);
  }
}
