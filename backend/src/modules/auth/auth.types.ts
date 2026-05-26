import { Role } from '../../common/enums/role.enum';

export type AuthenticatedUser = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  roles: Role[];
  permissions?: Record<string, string[]>;
};

export type JwtTokenType = 'access' | 'refresh';

export type JwtPayload = {
  sub: number;
  userId: number;
  email: string | null;
  phone: string | null;
  name: string | null;
  profileImageUrl?: string | null;
  roles: Role[];
  role: Role | null;
  permissions?: Record<string, string[]>;
  type: JwtTokenType;
};

export type AuthSuccessResponse<TData> = {
  success: true;
  message: string;
  data: TData;
};
