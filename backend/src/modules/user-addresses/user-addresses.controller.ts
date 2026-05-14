import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';

import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressDto } from './dto/user-address.dto';
import { UserAddressesService } from './user-addresses.service';
import { ApiResponseKey } from '../../common/decorators/api-response-key.decorator';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('users/me/addresses')
@ApiTags('User Addresses')
@ApiBearerAuth('access-token')
@Roles(Role.CUSTOMER)
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class UserAddressesController {
  constructor(private readonly userAddressesService: UserAddressesService) {}

  @Get()
  @ApiOperation({ summary: 'List saved addresses for the authenticated customer' })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Success',
        addresses: [
          {
            id: 1,
            userId: 3,
            label: 'Home',
            address: '12 MG Road, Bengaluru',
            city: 'Bengaluru',
            state: 'Karnataka',
            latitude: 12.9716,
            longitude: 77.5946,
            isDefault: true,
          },
        ],
      },
    },
  })
  @ApiResponseKey('addresses')
  list(@Req() request: { user: AuthenticatedUser }): Promise<UserAddressDto[]> {
    return this.userAddressesService.list(request.user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a saved address for the authenticated customer' })
  @ApiBody({ type: CreateUserAddressDto })
  @ApiCreatedResponse({
    schema: {
      example: {
        success: true,
        message: 'Success',
        address: {
          id: 1,
          userId: 3,
          label: 'Home',
          address: '12 MG Road, Bengaluru',
          city: 'Bengaluru',
          state: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          isDefault: true,
        },
      },
    },
  })
  @ApiStandardErrorResponses({ badRequest: true })
  @ApiResponseKey('address')
  create(
    @Req() request: { user: AuthenticatedUser },
    @Body() payload: CreateUserAddressDto,
  ): Promise<UserAddressDto> {
    return this.userAddressesService.create(request.user.id, payload);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a saved address for the authenticated customer' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiBody({ type: UpdateUserAddressDto })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Success',
        address: {
          id: 1,
          userId: 3,
          label: 'Work',
          address: '45 Residency Road, Bengaluru',
          city: 'Bengaluru',
          state: 'Karnataka',
          latitude: 12.9725,
          longitude: 77.608,
          isDefault: false,
        },
      },
    },
  })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  @ApiResponseKey('address')
  update(
    @Req() request: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateUserAddressDto,
  ): Promise<UserAddressDto> {
    return this.userAddressesService.update(request.user.id, id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a saved address for the authenticated customer' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Success',
        addressDeletion: {
          deleted: true,
        },
      },
    },
  })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  @ApiResponseKey('addressDeletion')
  remove(
    @Req() request: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ deleted: true }> {
    return this.userAddressesService.remove(request.user.id, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Mark a saved address as the authenticated customer default' })
  @ApiParam({ name: 'id', type: Number, example: 1 })
  @ApiOkResponse({
    schema: {
      example: {
        success: true,
        message: 'Success',
        address: {
          id: 1,
          userId: 3,
          label: 'Home',
          address: '12 MG Road, Bengaluru',
          city: 'Bengaluru',
          state: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
          isDefault: true,
        },
      },
    },
  })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  @ApiResponseKey('address')
  setDefault(
    @Req() request: { user: AuthenticatedUser },
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserAddressDto> {
    return this.userAddressesService.setDefault(request.user.id, id);
  }
}
