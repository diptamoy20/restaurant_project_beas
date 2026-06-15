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
import { DecodedIdToken, UserRecord } from 'firebase-admin/auth';
import nodemailer from 'nodemailer';

import { AuthSuccessResponse, AuthenticatedUser, JwtPayload } from './auth.types';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { SocialLoginDto, SocialLoginProvider } from './dto/social-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FirebaseAuthService } from './firebase-auth.service';
import { CloudinaryService } from '../../common/cloudinary/cloudinary.service';
import { CloudinaryImageUploadResult } from '../../common/cloudinary/cloudinary.types';
import {
  getDefaultPermissionsForRoles,
  PermissionMap,
} from '../../common/constants/default-permissions';
import { Role } from '../../common/enums/role.enum';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaUserWithRole = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  profileImagePublicId: string | null;
  password: string;
  isActive: boolean;
  refreshToken: string | null;
  refreshTokenExpiresAt: Date | null;
  lastLoginAt: Date | null;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  permissions: Prisma.JsonValue | null;
  role: { role: { name: string } } | null;
};

type SessionOptions = {
  message: string;
  updateLoginMetadata: boolean;
  preferredRole?: Role;
};

type FirebaseSocialProfile = {
  provider: SocialLoginProvider;
  providerUserId: string;
  email: string | null;
  phone: string | null;
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
    private readonly cloudinaryService: CloudinaryService,
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
        role: {
          create: { roleId: customerRole.id },
        },
      },
      include: {
        role: {
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

  async login(
    payload: LoginDto,
    preferredRole?: Role,
  ): Promise<AuthSuccessResponse<AuthResponseDto>> {
    if (!payload.email && !payload.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    const conditions: Array<{ email?: string; phone?: string }> = [];
    if (payload.email) conditions.push({ email: payload.email });
    if (payload.phone) conditions.push({ phone: payload.phone });

    const user = await this.prisma.user.findFirst({
      where: { OR: conditions },
      include: {
        role: {
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
      preferredRole,
    });
  }

  async socialLogin(payload: SocialLoginDto): Promise<AuthSuccessResponse<AuthResponseDto>> {
    const expectedFirebaseProvider = FIREBASE_SIGN_IN_PROVIDERS[payload.provider];

    if (!expectedFirebaseProvider) {
      this.logger.warn(`Social login rejected for unsupported provider: ${payload.provider}`);
      throw new BadRequestException('Unsupported social login provider');
    }

    const decodedToken = await this.firebaseAuthService.verifyIdToken(payload.idToken);
    const firebaseUser = await this.firebaseAuthService.getUser(decodedToken.uid);
    const actualFirebaseProvider = decodedToken.firebase?.sign_in_provider;

    if (actualFirebaseProvider !== expectedFirebaseProvider) {
      this.logger.warn(
        `Social login provider mismatch: requested ${payload.provider}, token provider ${
          actualFirebaseProvider ?? 'missing'
        }`,
      );
      throw new UnauthorizedException('Invalid social login token');
    }

    const email = this.resolveFirebaseEmail(decodedToken, firebaseUser, expectedFirebaseProvider);
    const phone = this.resolveFirebasePhone(decodedToken, firebaseUser, expectedFirebaseProvider);

    if (!email) {
      this.logger.warn(
        `Social login rejected: missing email for Firebase uid ${this.maskIdentifier(
          decodedToken.uid,
        )}`,
      );
      throw new UnauthorizedException('Social account email is required');
    }

    if (
      !this.isFirebaseEmailVerified(email, decodedToken, firebaseUser, expectedFirebaseProvider)
    ) {
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
      phone,
      name:
        this.normalizeOptionalString(decodedToken.name) ??
        this.normalizeOptionalString(firebaseUser.displayName),
      picture:
        this.normalizeOptionalString(decodedToken.picture) ??
        this.normalizeOptionalString(firebaseUser.photoURL),
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
    const currentUser = await this.loadAuthUser(user.id);

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildStandardResponse('Profile loaded', this.toAuthUserDto(currentUser));
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
    const shouldReplaceProfileImageUrl =
      profileImageUrl !== undefined && profileImageUrl !== currentUser.profileImageUrl;

    if (profileImageUrl !== undefined) {
      data.profileImageUrl = profileImageUrl;
    }

    if (shouldReplaceProfileImageUrl) {
      data.profileImagePublicId = null;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data,
      include: {
        role: {
          include: {
            role: true,
          },
        },
      },
    });

    if (shouldReplaceProfileImageUrl) {
      await this.cloudinaryService.deleteImage(currentUser.profileImagePublicId);
    }

    return this.buildStandardResponse('Profile updated', this.toAuthUserDto(updatedUser));
  }

  async updateProfileImage(
    user: AuthenticatedUser,
    file: Express.Multer.File,
  ): Promise<AuthSuccessResponse<AuthUserDto>> {
    const currentUser = await this.loadAuthUser(user.id);

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    let uploadedImage: CloudinaryImageUploadResult | null = null;

    try {
      uploadedImage = await this.cloudinaryService.uploadImage(file, 'users/profile-images');

      const updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          profileImageUrl: uploadedImage.secureUrl,
          profileImagePublicId: uploadedImage.publicId,
        },
        include: {
          role: {
            include: {
              role: true,
            },
          },
        },
      });

      await this.cloudinaryService.deleteImage(currentUser.profileImagePublicId);

      return this.buildStandardResponse('Profile image updated', this.toAuthUserDto(updatedUser));
    } catch (error) {
      if (uploadedImage) {
        await this.cloudinaryService.deleteImage(uploadedImage.publicId);
      }

      throw error;
    }
  }

  async validateUserById(id: number): Promise<AuthenticatedUser | null> {
    const user = await this.loadAuthUser(id);

    if (!user || !user.isActive) {
      return null;
    }

    return this.toAuthenticatedUser(user);
  }

  private async issueSession(
    user: PrismaUserWithRole,
    options: SessionOptions,
  ): Promise<AuthSuccessResponse<AuthResponseDto>> {
    if (options.preferredRole) {
      const role = this.mapEffectiveRole(user);
      this.resolvePrimaryRole(role, options.preferredRole);
    }

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
      user: this.toAuthUserDto(user, options.preferredRole),
    });
  }

  private buildStandardResponse<TData>(message: string, data: TData): AuthSuccessResponse<TData> {
    return {
      success: true,
      message,
      data,
    };
  }

  private signAccessToken(user: PrismaUserWithRole): string {
    return this.jwtService.sign(this.buildJwtPayload(user, ACCESS_TOKEN_TYPE), {
      secret: this.getAccessTokenSecret(),
      expiresIn: this.getAccessTokenExpiresIn(),
    });
  }

  private signRefreshToken(user: PrismaUserWithRole): string {
    return this.jwtService.sign(this.buildJwtPayload(user, REFRESH_TOKEN_TYPE), {
      secret: this.getRefreshTokenSecret(),
      expiresIn: this.getRefreshTokenExpiresIn(),
    });
  }

  private buildJwtPayload(
    user: PrismaUserWithRole,
    type: typeof ACCESS_TOKEN_TYPE | typeof REFRESH_TOKEN_TYPE,
  ): JwtPayload {
    const role = this.mapEffectiveRole(user);
    const permissions = this.resolvePermissions(user.permissions, role);

    return {
      sub: user.id,
      userId: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      profileImageUrl: user.profileImageUrl,
      role: this.resolvePrimaryRole(role),
      permissions,
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

  private async loadAuthUser(id: number): Promise<PrismaUserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  private async loadAuthUserByEmail(email: string): Promise<PrismaUserWithRole | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
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
  ): Promise<PrismaUserWithRole | null> {
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
            role: {
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
  ): Promise<PrismaUserWithRole> {
    const existingLinkedUser = await this.loadAuthUserBySocialAccount(
      profile.provider,
      profile.providerUserId,
    );

    if (existingLinkedUser) {
      return this.syncLinkedSocialUser(existingLinkedUser, profile);
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
                role: {
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
                role: {
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
                  role: {
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
                phone: profile.phone,
                profileImageUrl: profile.picture,
                password,
                isActive: true,
                role: {
                  create: { roleId: customerRole.id },
                },
              },
            },
          },
          include: {
            user: {
              include: {
                role: {
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
  ): Promise<PrismaUserWithRole> {
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
            role: {
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

  private async syncLinkedSocialUser(
    user: PrismaUserWithRole,
    profile: FirebaseSocialProfile,
  ): Promise<PrismaUserWithRole> {
    const userData: Prisma.UserUpdateInput = {};

    if (!user.email && profile.email) {
      userData.email = profile.email;
    }

    if (!user.name && profile.name) {
      userData.name = profile.name;
    }

    if (!user.phone && profile.phone) {
      userData.phone = profile.phone;
    }

    if (!user.profileImageUrl && profile.picture) {
      userData.profileImageUrl = profile.picture;
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.socialAccount.update({
          where: {
            provider_providerUserId: {
              provider: profile.provider,
              providerUserId: profile.providerUserId,
            },
          },
          data: {
            email: profile.email,
          },
        });

        if (Object.keys(userData).length > 0) {
          return tx.user.update({
            where: { id: user.id },
            data: userData,
            include: {
              role: {
                include: {
                  role: true,
                },
              },
            },
          });
        }

        const currentUser = await tx.user.findUnique({
          where: { id: user.id },
          include: {
            role: {
              include: {
                role: true,
              },
            },
          },
        });

        if (!currentUser) {
          throw new UnauthorizedException('Invalid credentials');
        }

        return currentUser;
      });
    } catch (error) {
      if (this.isUniqueConstraintError(error)) {
        this.logger.warn(
          `Social login email or phone conflict for user ${user.id}: ${this.maskIdentifier(
            profile.email ?? '',
          )}`,
        );
        throw new BadRequestException('Email or phone is already linked to another account');
      }

      throw error;
    }
  }

  private resolveFirebaseEmail(
    decodedToken: DecodedIdToken,
    firebaseUser: UserRecord,
    expectedFirebaseProvider: string,
  ): string | null {
    const tokenEmail = this.normalizeOptionalString(decodedToken.email)?.toLowerCase();

    if (tokenEmail) {
      return tokenEmail;
    }

    const userEmail = this.normalizeOptionalString(firebaseUser.email)?.toLowerCase();

    if (userEmail) {
      return userEmail;
    }

    return (
      firebaseUser.providerData
        .filter((provider) => provider.providerId === expectedFirebaseProvider)
        .map((provider) => this.normalizeOptionalString(provider.email)?.toLowerCase() ?? null)
        .find((email): email is string => Boolean(email)) ?? null
    );
  }

  private resolveFirebasePhone(
    decodedToken: DecodedIdToken,
    firebaseUser: UserRecord,
    expectedFirebaseProvider: string,
  ): string | null {
    const tokenPhone = this.normalizeOptionalString(decodedToken.phone_number);

    if (tokenPhone) {
      return tokenPhone;
    }

    const userPhone = this.normalizeOptionalString(firebaseUser.phoneNumber);

    if (userPhone) {
      return userPhone;
    }

    return (
      firebaseUser.providerData
        .filter((provider) => provider.providerId === expectedFirebaseProvider)
        .map((provider) => this.normalizeOptionalString(provider.phoneNumber) ?? null)
        .find((phone): phone is string => Boolean(phone)) ?? null
    );
  }

  private isFirebaseEmailVerified(
    email: string,
    decodedToken: DecodedIdToken,
    firebaseUser: UserRecord,
    expectedFirebaseProvider: string,
  ): boolean {
    const tokenEmail = this.normalizeOptionalString(decodedToken.email)?.toLowerCase();

    if (tokenEmail === email && decodedToken.email_verified === true) {
      return true;
    }

    const userEmail = this.normalizeOptionalString(firebaseUser.email)?.toLowerCase();

    if (userEmail === email && firebaseUser.emailVerified) {
      return true;
    }

    return firebaseUser.providerData.some((provider) => {
      const providerEmail = this.normalizeOptionalString(provider.email)?.toLowerCase();

      return provider.providerId === expectedFirebaseProvider && providerEmail === email;
    });
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

  private async ensureLoginAllowed(user: PrismaUserWithRole): Promise<void> {
    if (!user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new ForbiddenException(this.buildAccountLockedMessage(user.lockUntil));
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

  private async handleFailedLogin(user: PrismaUserWithRole): Promise<void> {
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

  private buildAccountLockedMessage(lockUntil: Date): string {
    const remainingMs = Math.max(lockUntil.getTime() - Date.now(), 0);
    const remainingMinutes = Math.ceil(remainingMs / 60000);
    const unlockTime = lockUntil.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (remainingMinutes <= 1) {
      return `Account locked. Try again in under 1 minute (unlocks around ${unlockTime}).`;
    }

    return `Account locked. Try again in ${remainingMinutes} minute(s) (unlocks around ${unlockTime}).`;
  }

  private toAuthenticatedUser(user: PrismaUserWithRole): AuthenticatedUser {
    const effectiveRole = this.mapEffectiveRole(user);
    const role = this.resolvePrimaryRole(effectiveRole);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      role,
      permissions: this.resolvePermissions(user.permissions, effectiveRole),
    };
  }

  private toAuthUserDto(user: PrismaUserWithRole, preferredRole?: Role): AuthUserDto {
    const effectiveRole = this.mapEffectiveRole(user);
    const role = this.resolvePrimaryRole(effectiveRole, preferredRole);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profileImageUrl: user.profileImageUrl,
      role,
      permissions: this.resolvePermissions(user.permissions, effectiveRole),
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

  private mapRole(user: PrismaUserWithRole): Role | null {
    return (user.role?.role.name as Role | undefined) ?? null;
  }

  private mapEffectiveRole(user: PrismaUserWithRole): Role {
    return this.mapRole(user) ?? Role.CUSTOMER;
  }

  private resolvePrimaryRole(role: Role, preferredRole?: Role): Role {
    if (preferredRole && role !== preferredRole) {
      throw new ForbiddenException(`User does not have the ${preferredRole} role`);
    }

    return preferredRole ?? role;
  }

  private resolvePermissions(
    value: Prisma.JsonValue | null | undefined,
    role: Role,
  ): PermissionMap {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return getDefaultPermissionsForRoles([role]);
    }

    const permissions: PermissionMap = {};

    for (const [module, actions] of Object.entries(value)) {
      if (Array.isArray(actions)) {
        permissions[module] = actions.map(String).filter(Boolean);
      }
    }

    return Object.keys(permissions).length ? permissions : getDefaultPermissionsForRoles([role]);
  }
}
