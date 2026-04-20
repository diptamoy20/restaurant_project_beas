import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';

import { MembershipResponseDto } from './dto';
import { MembershipService } from './membership.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@Controller('membership')
@Roles(Role.ADMIN, Role.CUSTOMER)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('user/:userId')
  getMembership(@Param('userId', ParseIntPipe) userId: number): Promise<MembershipResponseDto> {
    return this.membershipService.getMembership(userId);
  }
}
