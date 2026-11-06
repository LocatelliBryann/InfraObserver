import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { getJwtSecret, getSessionDurationSeconds } from "../config/auth";
import type { UserRecord, UserRepository } from "../repositories/user.repository";
import type {
  CreateAdminInput,
  LoginInput,
} from "../utils/validation/auth.schema";

// Custo do bcrypt: ~250 ms por verificação, o que encarece ataques de força bruta.
const BCRYPT_ROUNDS = 12;

// Hash de uma senha aleatória. Quando o e-mail não existe, a senha é comparada
// com ele mesmo assim, para a resposta levar o mesmo tempo e não revelar quais
// e-mails estão cadastrados.
const DUMMY_PASSWORD_HASH =
  "$2b$12$AXldhQXcTZSeTp0/3X2FGOJQjU0KeUuvANXeEMNCkgqEZOPTSaWWO";

export const USER_ROLES = {
  admin: "ADMIN",
} as const;

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Invalid email or password");
  }
}

function toSessionUser(user: UserRecord): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async login(input: LoginInput): Promise<{ token: string; user: SessionUser }> {
    const user = await this.users.findByEmail(input.email);

    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    await this.users.updateLastLogin(user.id, this.now());

    return {
      token: this.signToken(user),
      user: toSessionUser(user),
    };
  }

  signToken(user: Pick<UserRecord, "id" | "role">): string {
    return jwt.sign({ role: user.role }, getJwtSecret(), {
      subject: String(user.id),
      expiresIn: getSessionDurationSeconds(),
      algorithm: "HS256",
    });
  }

  // Valida o token do cookie e confere se o usuário ainda existe.
  // Token inválido, adulterado ou expirado devolve null.
  async verifySession(token: string): Promise<SessionUser | null> {
    let subject: string | undefined;

    try {
      const payload = jwt.verify(token, getJwtSecret(), {
        algorithms: ["HS256"],
      });

      subject = typeof payload === "string" ? undefined : payload.sub;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }

      throw error;
    }

    const userId = Number(subject);

    if (!Number.isInteger(userId) || userId <= 0) {
      return null;
    }

    const user = await this.users.findById(userId);

    return user ? toSessionUser(user) : null;
  }

  // Cria o administrador ou, se o e-mail já existir, troca o nome e a senha.
  async upsertAdmin(
    input: CreateAdminInput,
  ): Promise<{ user: SessionUser; created: boolean }> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const existing = await this.users.findByEmail(input.email);

    if (existing) {
      const updated = await this.users.updateCredentials(existing.id, {
        name: input.name,
        passwordHash,
      });

      return { user: toSessionUser(updated), created: false };
    }

    const created = await this.users.create({
      email: input.email,
      name: input.name,
      passwordHash,
      role: USER_ROLES.admin,
    });

    return { user: toSessionUser(created), created: true };
  }
}
