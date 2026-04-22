import { Controller, Get, Param, ParseIntPipe, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { MembershipResponseDto } from './dto';
import { MembershipService } from './membership.service';
import { ApiStandardErrorResponses } from '../../common/decorators/api-standard-error-responses.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { AuthenticatedUser } from '../auth/auth.types';

@Controller('membership')
@Roles(Role.ADMIN, Role.CUSTOMER)
@ApiTags('Membership')
@ApiBearerAuth('access-token')
@ApiStandardErrorResponses({ unauthorized: true, forbidden: true })
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get membership by user id' })
  @ApiParam({ name: 'userId', type: Number, example: 3 })
  @ApiOkResponse({ type: MembershipResponseDto })
  @ApiStandardErrorResponses({ badRequest: true, notFound: true })
  getMembership(
    @Param('userId', ParseIntPipe) userId: number,
    @Req() request: { user: AuthenticatedUser },
  ): Promise<MembershipResponseDto> {
    return this.membershipService.getMembership(userId, request.user);
  }
}
