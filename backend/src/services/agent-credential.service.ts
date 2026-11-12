import type { EndpointRecord, EndpointRepository } from "../repositories/endpoint.repository";
import type { EnrollmentTokenRepository } from "../repositories/enrollment-token.repository";
import {
  AGENT_CREDENTIAL_PREFIX,
  generateToken,
  hashToken,
} from "../security/agent-tokens";
import type { RegisterEndpointInput } from "../utils/validation/endpoint.schema";

export class InvalidEnrollmentTokenError extends Error {
  constructor() {
    super("Invalid enrollment token");
    this.name = "InvalidEnrollmentTokenError";
  }
}

export class EndpointOwnedByAnotherClientError extends Error {
  constructor() {
    super("Endpoint belongs to another client");
    this.name = "EndpointOwnedByAnotherClientError";
  }
}

export class EndpointNotFoundError extends Error {
  constructor() {
    super("Endpoint not found");
    this.name = "EndpointNotFoundError";
  }
}

// Agente identificado pela credencial própria.
export interface AuthenticatedAgent {
  endpointId: number;
  agentId: string;
  clientId: number | null;
}

export type CredentialCheck =
  | { status: "valid"; agent: AuthenticatedAgent }
  | { status: "revoked" }
  | { status: "unknown" };

export class AgentCredentialService {
  constructor(
    private readonly endpoints: EndpointRepository,
    private readonly enrollmentTokens: EnrollmentTokenRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async checkCredential(credential: string): Promise<CredentialCheck> {
    const endpoint = await this.endpoints.findByCredentialHash(
      hashToken(credential),
    );

    if (!endpoint) {
      return { status: "unknown" };
    }

    if (endpoint.credentialRevokedAt) {
      return { status: "revoked" };
    }

    return {
      status: "valid",
      agent: {
        endpointId: endpoint.id,
        agentId: endpoint.agentId,
        clientId: endpoint.clientId,
      },
    };
  }

  // Os tokens da lista AGENT_TOKENS (compartilhados) continuam valendo para os
  // agentes antigos, mas não para um PC que já tem credencial própria ou que
  // teve o acesso revogado. Assim, revogar no dashboard não tem atalho.
  async canUseSharedToken(agentId: string): Promise<boolean> {
    const endpoint = await this.endpoints.findByAgentId(agentId);

    if (!endpoint) {
      return true;
    }

    return (
      endpoint.credentialIssuedAt === null &&
      endpoint.credentialRevokedAt === null
    );
  }

  // Troca o token de instalação do cliente por uma credencial só deste PC.
  // Instalar de novo no mesmo PC gera outra credencial e invalida a anterior.
  async enroll(
    enrollmentToken: string,
    input: RegisterEndpointInput,
  ): Promise<{ credential: string; endpoint: EndpointRecord }> {
    const now = this.now();
    const token = await this.enrollmentTokens.findByHash(
      hashToken(enrollmentToken),
    );

    if (
      !token ||
      token.revokedAt !== null ||
      (token.expiresAt !== null && token.expiresAt <= now)
    ) {
      throw new InvalidEnrollmentTokenError();
    }

    const existing = await this.endpoints.findByAgentId(input.agentId);

    if (
      existing?.clientId != null &&
      existing.clientId !== token.clientId
    ) {
      throw new EndpointOwnedByAnotherClientError();
    }

    const credential = generateToken(AGENT_CREDENTIAL_PREFIX);
    const credentialFields = {
      clientId: token.clientId,
      credentialHash: hashToken(credential),
      credentialIssuedAt: now,
    };

    const endpoint = existing
      ? await this.endpoints.update(existing.id, {
          hostname: input.hostname,
          ipAddress: input.ipAddress,
          osName: input.osName,
          osVersion: input.osVersion,
          agentVersion: input.agentVersion,
          status: "ONLINE",
          lastSeenAt: now,
          ...credentialFields,
          credentialRevokedAt: null,
        })
      : await this.endpoints.create({
          ...input,
          status: "ONLINE",
          lastSeenAt: now,
          ...credentialFields,
        });

    await this.enrollmentTokens.registerUse(token.id, now);

    return { credential, endpoint };
  }

  // Corta o acesso do PC: a credencial deixa de valer e o token compartilhado
  // também é recusado para ele. Os dados já recebidos continuam no histórico.
  async revokeEndpoint(endpointId: number): Promise<EndpointRecord> {
    const endpoint = await this.endpoints.findById(endpointId);

    if (!endpoint) {
      throw new EndpointNotFoundError();
    }

    if (endpoint.credentialRevokedAt) {
      return endpoint;
    }

    return this.endpoints.update(endpointId, {
      credentialRevokedAt: this.now(),
    });
  }
}
