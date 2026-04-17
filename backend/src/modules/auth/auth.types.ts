import { Role } from '../../common/enums/role.enum';

export type AuthenticatedUser = {
  id: number;
  email: string | null;
  phone: string | null;
  roles: Role[];
};

export type JwtPayload = {
  sub: number;
  email: string | null;
  phone: string | null;
  roles: Role[];
};

