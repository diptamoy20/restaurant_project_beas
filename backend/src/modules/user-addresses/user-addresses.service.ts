import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { UserAddress } from '@prisma/client';

import { CreateUserAddressDto } from './dto/create-user-address.dto';
import { UpdateUserAddressDto } from './dto/update-user-address.dto';
import { UserAddressDto } from './dto/user-address.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserAddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: number): Promise<UserAddressDto[]> {
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { id: 'desc' }],
    });

    return addresses.map((address) => this.mapAddress(address));
  }

  async create(userId: number, payload: CreateUserAddressDto): Promise<UserAddressDto> {
    const address = await this.prisma.$transaction(async (transaction) => {
      const existingCount = await transaction.userAddress.count({ where: { userId } });
      const shouldBeDefault = payload.isDefault ?? existingCount === 0;

      if (shouldBeDefault) {
        await transaction.userAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      return transaction.userAddress.create({
        data: {
          userId,
          label: payload.label ?? 'Home',
          address: payload.address.trim(),
          city: this.cleanOptionalText(payload.city),
          state: this.cleanOptionalText(payload.state),
          latitude: payload.latitude,
          longitude: payload.longitude,
          isDefault: shouldBeDefault,
        },
      });
    });

    return this.mapAddress(address);
  }

  async update(
    userId: number,
    addressId: number,
    payload: UpdateUserAddressDto,
  ): Promise<UserAddressDto> {
    await this.ensureAddressOwner(userId, addressId);

    const address = await this.prisma.$transaction(async (transaction) => {
      if (payload.isDefault) {
        await transaction.userAddress.updateMany({
          where: { userId, id: { not: addressId } },
          data: { isDefault: false },
        });
      }

      return transaction.userAddress.update({
        where: { id: addressId },
        data: {
          ...(payload.label !== undefined && { label: payload.label }),
          ...(payload.address !== undefined && { address: payload.address.trim() }),
          ...(payload.city !== undefined && { city: this.cleanOptionalText(payload.city) }),
          ...(payload.state !== undefined && { state: this.cleanOptionalText(payload.state) }),
          ...(payload.latitude !== undefined && { latitude: payload.latitude }),
          ...(payload.longitude !== undefined && { longitude: payload.longitude }),
          ...(payload.isDefault !== undefined && { isDefault: payload.isDefault }),
        },
      });
    });

    return this.mapAddress(address);
  }

  async remove(userId: number, addressId: number): Promise<{ deleted: true }> {
    await this.ensureAddressOwner(userId, addressId);

    const orderCount = await this.prisma.order.count({
      where: { userId, addressId },
    });

    if (orderCount > 0) {
      throw new BadRequestException('Address is linked to an order and cannot be deleted');
    }

    await this.prisma.userAddress.delete({ where: { id: addressId } });

    return { deleted: true };
  }

  async setDefault(userId: number, addressId: number): Promise<UserAddressDto> {
    await this.ensureAddressOwner(userId, addressId);

    const address = await this.prisma.$transaction(async (transaction) => {
      await transaction.userAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      return transaction.userAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    return this.mapAddress(address);
  }

  private async ensureAddressOwner(userId: number, addressId: number): Promise<void> {
    const address = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId },
      select: { id: true },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }
  }

  private cleanOptionalText(value?: string): string | null {
    const cleanValue = value?.trim();
    return cleanValue || null;
  }

  private mapAddress(address: UserAddress): UserAddressDto {
    return {
      id: address.id,
      userId: address.userId,
      label: address.label,
      address: address.address,
      city: address.city,
      state: address.state,
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: address.isDefault,
    };
  }
}
