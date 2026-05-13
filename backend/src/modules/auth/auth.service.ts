import { createHash, randomBytes } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import { compare, hash } from 'bcryptjs';
import nodemailer from 'nodemailer';

import { AuthSuccessResponse, AuthenticatedUser, JwtPayload } from './auth.types';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SocialLoginDto, SocialLoginProvider } from './dto/social-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FirebaseAuthService } from './firebase-auth.service';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaUserWithRoles = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  password: string;
  isActive: boolean;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  roles: { role: { name: string } }[];
};

type SessionOptions = {
  message: string;
  updateLoginMetadata: boolean;
};

type FirebaseSocialProfile = {
  provider: SocialLoginProvider;
  providerUserId: string;
  email: string | null;
  name: string | null;
  picture: string | null;
};

const ACCESS_TOKEN_TYPE = 'access' as const;
const REFRESH_TOKEN_TYPE = 'refresh' as const;
const DEFAULT_ACCESS_TOKEN_EXPIRES_IN = '7d';
const DEFAULT_REFRESH_TOKEN_EXPIRES_IN = '7d';
const DEFAULT_LOGIN_LOCK_THRESHOLD = 5;
const DEFAULT_LOGIN_LOCK_DURATION_MINUTES = 15;
const DEFAULT_BCRYPT_ROUNDS = 10;
const DEFAULT_RESET_TOKEN_EXPIRES_MINUTES = 60;
const FIREBASE_SIGN_IN_PROVIDERS: Record<SocialLoginProvider, string> = {
  [SocialLoginProvider.FIREBASE_GOOGLE]: 'google.com',
  [SocialLoginProvider.FIREBASE_FACEBOOK]: 'facebook.com',
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly loginLockThreshold: number;
  private readonly loginLockDurationMs: number;
  private readonly bcryptRounds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly firebaseAuthService: FirebaseAuthService,
  ) {
    this.loginLockThreshold =
      this.configService.get<number>('LOGIN_LOCK_THRESHOLD') ?? DEFAULT_LOGIN_LOCK_THRESHOLD;
    const lockDurationMinutes =
      this.configService.get<number>('LOGIN_LOCK_DURATION_MINUTES') ??
      DEFAULT_LOGIN_LOCK_DURATION_MINUTES;
    this.loginLockDurationMs = lockDurationMinutes * 60 * 1000;
    this.bcryptRounds = this.configService.get<number>('BCRYPT_ROUNDS') ?? DEFAULT_BCRYPT_ROUNDS;
  }

  async register(payload: RegisterDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conditions: Array<{ email?: string; phone?: string }> = [];
    if (payload.email) conditions.push({ email: payload.email });
    if (payload.phone) conditions.push({ phone: payload.phone });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: conditions },
    });

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    const customerRole = await this.prisma.roleMaster.findUnique({
      where: { name: Role.CUSTOMER },
    });

    if (!customerRole) {
      throw new BadRequestException('Customer role is not configured');
    }

    const password = await hash(payload.password, this.bcryptRounds);

    const user = await this.prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        password,
        roles: {
          create: [{ roleId: customerRole.id }],
        },
      },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    this.logger.log(`User registered: ${user.id}`);

    return this.issueSession(user, {
      message: 'Registration successful',
      updateLoginMetadata: true,
    });
  }

  async login(payload: LoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conditions: Array<{ email?: string; phone?: string }> = [];
    if (payload.email) conditions.push({ email: payload.email });
    if (payload.phone) conditions.push({ phone: payload.phone });

    const user = await this.prisma.user.findFirst({
      where: { OR: conditions },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn('Login failed: unknown account');
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.ensureLoginAllowed(user);

    const isPasswordValid = await compare(payload.password, user.password);

    if (!isPasswordValid) {
      await this.handleFailedLogin(user);
      this.logger.warn(`Login failed for user ${user.id}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`Login successful for user ${user.id}`);

    return this.issueSession(user, {
      message: 'Login successful',
      updateLoginMetadata: true,
    });
  }

  async socialLogin(payload: SocialLoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    const expectedFirebaseProvider = FIREBASE_SIGN_IN_PROVIDERS[payload.provider];

    if (!expectedFirebaseProvider) {
      this.logger.warn(`Social login rejected for unsupported provider: ${payload.provider}`);
      throw new BadRequestException('Unsupported social login provider');
    }

    const decodedToken = await this.firebaseAuthService.verifyIdToken(payload.idToken);
    const actualFirebaseProvider = decodedToken.firebase?.sign_in_provider;

    if (actualFirebaseProvider !== expectedFirebaseProvider) {
      this.logger.warn(
        `Social login provider mismatch: requested ${payload.provider}, token provider ${
          actualFirebaseProvider ?? 'missing'
        }`,
      );
      throw new UnauthorizedException('Invalid social login token');
    }

    const email = this.normalizeOptionalString(decodedToken.email)?.toLowerCase() ?? null;

    if (email && decodedToken.email_verified !== true) {
      this.logger.warn(
        `Social login rejected: unverified email for Firebase uid ${this.maskIdentifier(
          decodedToken.uid,
        )}`,
      );
      throw new UnauthorizedException('Verified email is required');
    }

    const profile: FirebaseSocialProfile = {
      provider: payload.provider,
      providerUserId: decodedToken.uid,
      email,
      name: this.normalizeOptionalString(decodedToken.name),
      picture: this.normalizeOptionalString(decodedToken.picture),
    };

    const user = await this.findOrCreateSocialUser(profile);

    await this.ensureLoginAllowed(user);
    this.logger.log(`Social login successful for user ${user.id}`);

    return this.issueSession(user, {
      message: 'Login successful',
      updateLoginMetadata: true,
    });
  }

  async forgotPassword(
    payload: ForgotPasswordDto,
  ): Promise<AuthSuccessResponse<{ resetRequested: boolean }>> {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    const response = this.buildStandardResponse(
      'If an account exists, password reset instructions have been sent.',
      { resetRequested: true },
    );

    if (!user || !user.isActive) {
      return response;
    }

    const resetToken = randomBytes(32).toString('hex');
    const resetPasswordToken = this.hashResetToken(resetToken);
    const resetPasswordExpiresAt = new Date(
      Date.now() + this.getResetTokenExpiryMinutes() * 60 * 1000,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken,
        resetPasswordExpiresAt,
      },
    });

    await this.sendPasswordResetEmail(normalizedEmail, resetToken);

    return response;
  }

  async resetPassword(
    payload: ResetPasswordDto,
  ): Promise<AuthSuccessResponse<{ passwordReset: boolean }>> {
    const resetPasswordToken = this.hashResetToken(payload.token.trim());
    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken,
        resetPasswordExpiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const password = await hash(payload.password, this.bcryptRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        resetPasswordToken: null,
        resetPasswordExpiresAt: null,
        refreshToken: null,
        refreshTokenExpiresAt: null,
        failedLoginAttempts: 0,
        lockUntil: null,
      },
    });

    return this.buildStandardResponse('Password reset successful. You can sign in now.', {
      passwordReset: true,
    });
  }

  async refresh(payload: RefreshTokenDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    const decoded = await this.verifyRefreshToken(payload.refreshToken);
    const user = await this.loadAuthUser(decoded.sub);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.ensureLoginAllowed(user);

    if (!user.refreshToken || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (user.refreshTokenExpiresAt <= new Date()) {
      await this.clearRefreshToken(user.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const tokenMatches = await compare(payload.refreshToken, user.refreshToken);

    if (!tokenMatches) {
      this.logger.warn(`Suspicious refresh token use for user ${user.id}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    this.logger.log(`Refresh token rotated for user ${user.id}`);

    return this.issueSession(user, {
      message: 'Token refreshed',
      updateLoginMetadata: false,
    });
  }

  async logout(
    user: AuthenticatedUser,
    payload?: LogoutDto,
  ): Promise<AuthSuccessResponse<{ loggedOut: boolean }>> {
    if (payload?.refreshToken) {
      const decoded = await this.verifyRefreshToken(payload.refreshToken);

      if (decoded.sub !== user.id) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const storedUser = await this.loadAuthUser(user.id);

      if (!storedUser?.refreshToken) {
        return this.buildStandardResponse('Logged out', { loggedOut: true });
      }

      const tokenMatches = await compare(payload.refreshToken, storedUser.refreshToken);

      if (!tokenMatches) {
        throw new UnauthorizedException('Invalid refresh token');
      }
    }

    await this.clearRefreshToken(user.id);
    this.logger.log(`Logout completed for user ${user.id}`);

    return this.buildStandardResponse('Logged out', { loggedOut: true });
  }

  async me(user: AuthenticatedUser): Promise<AuthSuccessResponse<AuthUserDto>> {
    return this.buildStandardResponse('Profile loaded', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      roles: user.roles,
    });
  }

  async updateMe(
    user: AuthenticatedUser,
    payload: UpdateProfileDto,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    const hasChanges = Object.values(payload).some((value) => value !== undefined);

    if (!hasChanges) {
      throw new BadRequestException('No profile changes provided');
    }

    const currentUser = await this.loadAuthUser(user.id);

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const name = payload.name === undefined ? undefined : payload.name.trim() || null;
    const email =
      payload.email === undefined ? undefined : payload.email.trim().toLowerCase() || null;
    const phone = payload.phone === undefined ? undefined : payload.phone.trim() || null;
    const profileImageUrl =
      payload.profileImageUrl === undefined ? undefined : payload.profileImageUrl.trim() || null;
    const nextEmail = email === undefined ? currentUser.email : email;
    const nextPhone = phone === undefined ? currentUser.phone : phone;

    if (!nextEmail && !nextPhone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conflicts: Array<{ email?: string; phone?: string }> = [];
    if (email) conflicts.push({ email });
    if (phone) conflicts.push({ phone });

    if (conflicts.length > 0) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          id: { not: user.id },
          OR: conflicts,
        },
      });

      if (existingUser) {
        throw new BadRequestException('Email or phone is already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (profileImageUrl !== undefined) data.profileImageUrl = profileImageUrl;

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data,
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.buildStandardResponse('Profile updated', this.toAuthUser(updatedUser));
  }

  async updateProfileImage(
    user: AuthenticatedUser,
    profileImageUrl: string,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    const currentUser = await this.loadAuthUser(user.id);

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { profileImageUrl },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    return this.buildStandardResponse('Profile image updated', this.toAuthUser(updatedUser));
  }

  async validateUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.loadAuthUser(id);

    if (!user || !user.isActive) {
      return null;
    }

    return this.toAuthUser(user);
  }

  private async issueSession(
    user: PrismaUserWithRoles,
    options: SessionOptions,
  ): Promise<AuthSuccessResponse<AuthResponseDto>> {
    const accessToken = this.signAccessToken(user);
    const refreshToken = this.signRefreshToken(user);
    const refreshTokenExpiresAt = this.getRefreshTokenExpiryDate();
    const hashedRefreshToken = await hash(refreshToken, this.bcryptRounds);

    const updateData: Prisma.UserUpdateInput = {
      refreshToken: hashedRefreshToken,
      refreshTokenExpiresAt,
    };

    if (options.updateLoginMetadata) {
      updateData.lastLoginAt = new Date();
      updateData.failedLoginAttempts = 0;
      updateData.lockUntil = null;
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return this.buildStandardResponse(options.message, {
      token: accessToken,
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      user: this.toAuthUser(user),
    });
  }

  private buildStandardResponse<TData>(message: string, data: TData): AuthSuccessResponse<TData> {
    return {
      success: true,
      message,
      data,
    };
  }

  private signAccessToken(user: PrismaUserWithRoles): string {
    return this.jwtService.sign(this.buildJwtPayload(user, ACCESS_TOKEN_TYPE), {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenExpiresIn(),
    });
  }

  private signRefreshToken(user: PrismaUserWithRoles): string {
    return this.jwtService.sign(this.buildJwtPayload(user, REFRESH_TOKEN_TYPE), {
      secret: this.getRefreshTokenSecret(),
      expiresIn: this.getRefreshTokenExpiresIn(),
    });
  }

  private buildJwtPayload(
    user: PrismaUserWithRoles,
    type: typeof ACCESS_TOKEN_TYPE | typeof REFRESH_TOKEN_TYPE,
  ): JwtPayload {
    const roles = this.mapRoles(user);

    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      roles,
      role: roles[0] ?? null,
      type,
    };
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${this.getWebAppUrl().replace(/\/$/, '')}/reset-password?token=${token}`;
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT') ?? 587;
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');
    const mailFrom =
      this.configService.get<string>('MAIL_FROM') ??
      'Restaurant Support <no-reply@restaurant.local>';

    if (!smtpHost) {
      this.logger.warn(
        `SMTP_HOST is not configured. Password reset link for ${email}: ${resetUrl}`,
      );
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    });

    await transporter.sendMail({
      from: mailFrom,
      to: email,
      subject: 'Reset your restaurant account password',
      text: `Use this secure link to reset your password: ${resetUrl}`,
      html: `<p>Use this secure link to reset your password:</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
    });
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.getRefreshTokenSecret(),
      });

      if (payload.type !== REFRESH_TOKEN_TYPE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return payload;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async loadAuthUser(id: number): Promise<PrismaUserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  private async loadAuthUserByEmail(email: string): Promise<PrismaUserWithRoles | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  private async loadAuthUserBySocialAccount(
    provider: SocialLoginProvider,
    providerUserId: string,
  ): Promise<PrismaUserWithRoles | null> {
    const socialAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider,
          providerUserId,
        },
      },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    return socialAccount?.user ?? null;
  }

  private async findOrCreateSocialUser(
    profile: FirebaseSocialProfile,
  ): Promise<PrismaUserWithRoles> {
    const existingLinkedUser = await this.loadAuthUserBySocialAccount(
      profile.provider,
      profile.providerUserId,
    );

    if (existingLinkedUser) {
      return existingLinkedUser;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const linkedAccount = await tx.socialAccount.findUnique({
          where: {
            provider_providerUserId: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          },
          include: {
            user: {
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        });

        if (linkedAccount) {
          return linkedAccount.user;
        }

        const customerRole = await tx.roleMaster.findUnique({
          where: { name: Role.CUSTOMER },
        });

        if (!customerRole) {
          throw new BadRequestException('Customer role is not configured');
        }

        const existingUser = profile.email
          ? await tx.user.findUnique({
              where: { email: profile.email },
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            })
          : null;

        if (existingUser) {
          const linkedSocialAccount = await tx.socialAccount.upsert({
            where: {
              provider_providerUserId: {
                provider: profile.provider,
                providerUserId: profile.providerUserId,
              },
            },
            update: {
              email: profile.email,
            },
            create: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
              email: profile.email,
              userId: existingUser.id,
            },
            include: {
              user: {
                include: {
                  roles: {
                    include: {
                      role: true,
                    },
                  },
                },
              },
            },
          });

          return linkedSocialAccount.user;
        }

        const password = await hash(randomBytes(32).toString('hex'), this.bcryptRounds);
        const socialAccount = await tx.socialAccount.create({
          data: {
            provider: profile.provider,
            providerUserId: profile.providerUserId,
            email: profile.email,
            user: {
              create: {
                name: profile.name,
                email: profile.email,
                profileImageUrl: profile.picture,
                password,
                isActive: true,
                roles: {
                  create: [{ roleId: customerRole.id }],
                },
              },
            },
          },
          include: {
            user: {
              include: {
                roles: {
                  include: {
                    role: true,
                  },
                },
              },
            },
          },
        });

        return socialAccount.user;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        this.logger.warn(
          `Social login unique conflict for ${profile.provider}:${this.maskIdentifier(
            profile.providerUserId,
          )}; retrying lookup`,
        );

        const linkedUser = await this.loadAuthUserBySocialAccount(
          profile.provider,
          profile.providerUserId,
        );

        if (linkedUser) {
          return linkedUser;
        }

        if (profile.email) {
          const existingUser = await this.loadAuthUserByEmail(profile.email);

          if (existingUser) {
            return this.linkSocialAccount(existingUser.id, profile);
          }
        }
      }

      throw error;
    }
  }

  private async linkSocialAccount(
    userId: number,
    profile: FirebaseSocialProfile,
  ): Promise<PrismaUserWithRoles> {
    const socialAccount = await this.prisma.socialAccount.upsert({
      where: {
        provider_providerUserId: {
          provider: profile.provider,
          providerUserId: profile.providerUserId,
        },
      },
      update: {
        email: profile.email,
      },
      create: {
        provider: profile.provider,
        providerUserId: profile.providerUserId,
        email: profile.email,
        userId,
      },
      include: {
        user: {
          include: {
            roles: {
              include: {
                role: true,
              },
            },
          },
        },
      },
    });

    return socialAccount.user;
  }

  private isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  private normalizeOptionalString(value: unknown): string | null {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  }

  private maskIdentifier(value: string): string {
    if (value.length <= 8) {
      return 'present';
    }

    return `${value.slice(0, 4)}...${value.slice(-4)}`;
  }

  private async ensureLoginAllowed(user: PrismaUserWithRoles): Promise<void> {
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException('Account locked. Try again later.');
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockUntil: null,
        },
      });
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
    }
  }

  private async handleFailedLogin(user: PrismaUserWithRoles): Promise<void> {
    const failedLoginAttempts = user.failedLoginAttempts + 1;
    const isLocked = failedLoginAttempts >= this.loginLockThreshold;
    const lockUntil = isLocked ? new Date(Date.now() + this.loginLockDurationMs) : user.lockUntil;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts,
        lockUntil,
      },
    });

    if (isLocked) {
      this.logger.warn(`Account locked after repeated failures for user ${user.id}`);
    }
  }

  private async clearRefreshToken(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  private toAuthUser(user: PrismaUserWithRoles): AuthenticatedUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      roles: this.mapRoles(user),
    };
  }

  private getAccessTokenSecret(): string {
    return this.configService.getOrThrow<string>('ACCESS_TOKEN_SECRET');
  }

  private getRefreshTokenSecret(): string {
    return this.configService.getOrThrow<string>('REFRESH_TOKEN_SECRET');
  }

  private getAccessTokenExpiresIn(): string {
    return (
      this.configService.get<string>('ACCESS_TOKEN_EXPIRES_IN') ?? DEFAULT_ACCESS_TOKEN_EXPIRES_IN
    );
  }

  private getResetTokenExpiryMinutes(): number {
    return (
      this.configService.get<number>('RESET_PASSWORD_TOKEN_EXPIRES_MINUTES') ??
      DEFAULT_RESET_TOKEN_EXPIRES_MINUTES
    );
  }

  private getWebAppUrl(): string {
    return this.configService.get<string>('WEB_APP_URL') ?? 'http://localhost:5173';
  }

  private getRefreshTokenExpiresIn(): string {
    return (
      this.configService.get<string>('REFRESH_TOKEN_EXPIRES_IN') ?? DEFAULT_REFRESH_TOKEN_EXPIRES_IN
    );
  }

  private getRefreshTokenExpiryDate(): Date {
    return new Date(Date.now() + this.parseDurationToMilliseconds(this.getRefreshTokenExpiresIn()));
  }

  private parseDurationToMilliseconds(duration: string): number {
    const match = duration.trim().match(/^(\d+)(ms|s|m|h|d)$/i);

    if (!match) {
      throw new BadRequestException(`Invalid duration value: ${duration}`);
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 'ms':
        return value;
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        throw new BadRequestException(`Invalid duration value: ${duration}`);
    }
  }

  private mapRoles(user: PrismaUserWithRoles): Role[] {
    return user.roles.map((entry) => entry.role.name as Role);
  }
}
