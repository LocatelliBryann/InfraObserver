import { prisma } from "../database/prisma";

export interface UserRecord {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  lastLoginAt: Date | null;
}

export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: number): Promise<UserRecord | null>;
  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: string;
  }): Promise<UserRecord>;
  updateCredentials(
    id: number,
    data: { name: string; passwordHash: string },
  ): Promise<UserRecord>;
  updateLastLogin(id: number, date: Date): Promise<UserRecord>;
}

export class PrismaUserRepository implements UserRepository {
  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  findById(id: number) {
    return prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: string;
  }) {
    return prisma.user.create({ data });
  }

  updateCredentials(
    id: number,
    data: { name: string; passwordHash: string },
  ) {
    return prisma.user.update({ where: { id }, data });
  }

  updateLastLogin(id: number, date: Date) {
    return prisma.user.update({
      where: { id },
      data: { lastLoginAt: date },
    });
  }
}
