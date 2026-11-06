import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { describe, expect, it, vi } from "vitest";

import { getJwtSecret } from "../../src/config/auth";
import type { UserRecord } from "../../src/repositories/user.repository";
import {
  AuthService,
  InvalidCredentialsError,
} from "../../src/services/auth.service";

const PASSWORD = "senha-correta-123";
const passwordHash = bcrypt.hashSync(PASSWORD, 4);

function createUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: 7,
    email: "admin@infraobserver.com.br",
    name: "Admin",
    passwordHash,
    role: "ADMIN",
    lastLoginAt: null,
    ...overrides,
  };
}

function createRepository(user: UserRecord | null = createUser()) {
  return {
    findByEmail: vi.fn().mockResolvedValue(user),
    findById: vi.fn().mockResolvedValue(user),
    create: vi.fn(async (data) => createUser({ ...data, id: 10 })),
    updateCredentials: vi.fn(async (id, data) =>
      createUser({ ...data, id }),
    ),
    updateLastLogin: vi.fn().mockResolvedValue(user),
  };
}

const now = new Date("2026-11-06T12:00:00.000Z");

describe("AuthService", () => {
  describe("login", () => {
    it("should return a signed token and the user for valid credentials", async () => {
      const repository = createRepository();
      const service = new AuthService(repository, () => now);

      const result = await service.login({
        email: "admin@infraobserver.com.br",
        password: PASSWORD,
      });

      expect(result.user).toEqual({
        id: 7,
        email: "admin@infraobserver.com.br",
        name: "Admin",
        role: "ADMIN",
      });
      expect(result.user).not.toHaveProperty("passwordHash");

      const payload = jwt.verify(result.token, getJwtSecret()) as jwt.JwtPayload;
      expect(payload.sub).toBe("7");
      expect(payload.role).toBe("ADMIN");
      expect(repository.updateLastLogin).toHaveBeenCalledWith(7, now);
    });

    it("should reject a wrong password", async () => {
      const repository = createRepository();
      const service = new AuthService(repository);

      await expect(
        service.login({
          email: "admin@infraobserver.com.br",
          password: "senha-errada",
        }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
      expect(repository.updateLastLogin).not.toHaveBeenCalled();
    });

    it("should reject an unknown email with the same error", async () => {
      const service = new AuthService(createRepository(null));

      await expect(
        service.login({ email: "nobody@example.com", password: PASSWORD }),
      ).rejects.toBeInstanceOf(InvalidCredentialsError);
    });
  });

  describe("verifySession", () => {
    it("should return the user for a valid token", async () => {
      const service = new AuthService(createRepository());
      const token = service.signToken({ id: 7, role: "ADMIN" });

      await expect(service.verifySession(token)).resolves.toMatchObject({
        id: 7,
        role: "ADMIN",
      });
    });

    it("should reject a tampered token", async () => {
      const service = new AuthService(createRepository());
      const token = service.signToken({ id: 7, role: "ADMIN" });
      const tampered = `${token.slice(0, -2)}xx`;

      await expect(service.verifySession(tampered)).resolves.toBeNull();
    });

    it("should reject a token signed with another secret", async () => {
      const service = new AuthService(createRepository());
      const token = jwt.sign({ role: "ADMIN" }, "x".repeat(40), {
        subject: "7",
      });

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it("should reject an expired token", async () => {
      const service = new AuthService(createRepository());
      const token = jwt.sign(
        { role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 60 },
        getJwtSecret(),
        { subject: "7" },
      );

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it("should reject a token whose user no longer exists", async () => {
      const service = new AuthService(createRepository(null));
      const token = service.signToken({ id: 7, role: "ADMIN" });

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it("should reject a token without a numeric subject", async () => {
      const service = new AuthService(createRepository());
      const token = jwt.sign({ role: "ADMIN" }, getJwtSecret(), {
        subject: "abc",
      });

      await expect(service.verifySession(token)).resolves.toBeNull();
    });

    it("should propagate database errors", async () => {
      const repository = createRepository();
      repository.findById.mockRejectedValue(new Error("db down"));
      const service = new AuthService(repository);
      const token = service.signToken({ id: 7, role: "ADMIN" });

      await expect(service.verifySession(token)).rejects.toThrow("db down");
    });
  });

  describe("upsertAdmin", () => {
    it("should create an admin with a hashed password", async () => {
      const repository = createRepository(null);
      const service = new AuthService(repository);

      const result = await service.upsertAdmin({
        email: "novo@infraobserver.com.br",
        name: "Novo",
        password: "uma-senha-bem-longa",
      });

      expect(result.created).toBe(true);

      const saved = repository.create.mock.calls[0][0];
      expect(saved.role).toBe("ADMIN");
      expect(saved.passwordHash).not.toBe("uma-senha-bem-longa");
      expect(bcrypt.compareSync("uma-senha-bem-longa", saved.passwordHash)).toBe(true);
    });

    it("should update name and password of an existing admin", async () => {
      const repository = createRepository();
      const service = new AuthService(repository);

      const result = await service.upsertAdmin({
        email: "admin@infraobserver.com.br",
        name: "Admin Novo",
        password: "outra-senha-longa",
      });

      expect(result.created).toBe(false);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.updateCredentials).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ name: "Admin Novo" }),
      );
    });
  });
});
