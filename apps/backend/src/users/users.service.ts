import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '../../generated/prisma';

/** Campos publicos de un usuario: nunca incluye passwordHash. */
export const USER_PUBLIC_FIELDS = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

export type PublicUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'createdAt'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: number): Promise<PublicUser | null> {
    return this.prisma.user.findUnique({ where: { id }, select: USER_PUBLIC_FIELDS });
  }

  /** Incluye el hash: solo para el flujo de login. */
  findByEmailWithHash(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  create(data: {
    name: string;
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<PublicUser> {
    return this.prisma.user.create({
      data: { ...data, email: data.email.toLowerCase() },
      select: USER_PUBLIC_FIELDS,
    });
  }

  findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: USER_PUBLIC_FIELDS,
      orderBy: { name: 'asc' },
    });
  }
}
