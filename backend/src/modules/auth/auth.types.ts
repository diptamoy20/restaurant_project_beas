import { Role } from '../../common/enums/role.enum';

export type AuthenticatedUser = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  roles: Role[];
};

export type JwtTokenType = 'access' | 'refresh';

export type JwtPayload = {
  sub: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  roles: Role[];
  type: JwtTokenType;
};

export type AuthSuccessResponse<TData> = {
  success: true;
  message: string;
  data: TData;
};
