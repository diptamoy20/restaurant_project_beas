import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { MembershipService } from './membership.service';

@Controller('membership')
@Roles(Role.ADMIN, Role.CUSTOMER)
export class MembershipController {
  constructor(private readonly membershipService: MembershipService) {}

  @Get('user/:userId')
  getMembership(@Param('userId', ParseIntPipe) userId: number) {
    return this.membershipService.getMembership(userId);
  }
}
