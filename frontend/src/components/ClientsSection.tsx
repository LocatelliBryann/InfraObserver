import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Building2, Check, Copy, KeyRound, Monitor, Plus } from "lucide-react";
import { Link } from "react-router";

import { ClientDirectoriesPanel } from "./ClientDirectoriesPanel";
import { EmptyState } from "./EmptyState";
import { RevokeAccessButton } from "./EndpointHealthSection";

import { ROUTES } from "../config/navigation";
import { describeClientError } from "../hooks/useClients";
import { getServerUrl } from "../services/apiClient";
import {
  CLIENT_FILTER_PARAM,
  clientFilterToUrlValue,
} from "../services/clientFilter";
import type {
  EndpointHealth,
  EndpointStatus,
} from "../services/endpointHealthService";
import type { Endpoint } from "../services/endpointsService";
import {
  clientsService,
  enrollmentTokenStatus,
  type Client,
  type CreatedEnrollmentToken,
  type EnrollmentToken,
  type EnrollmentTokenStatus,
} from "../services/clientsService";

// Opções de validade do token de instalação (em dias; vazio = sem validade).
export const TOKEN_VALIDITY_OPTIONS = [
  { label: "Sem validade", days: undefined },
  { label: "7 dias", days: 7 },
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
] as const;

const TOKEN_STATUS_BADGES: Record<
  EnrollmentTokenStatus,
  { label: string; className: string }
> = {
  active: { label: "Ativo", className: "bg-emerald-500/10 text-emerald-400" },
  revoked: { label: "Revogado", className: "bg-rose-500/10 text-rose-400" },
  expired: { label: "Expirado", className: "bg-slate-500/10 text-slate-400" },
};

export function silentInstallCommand(serverUrl: string, token: string): string {
  return `InfraObserverAgentSetup.exe /VERYSILENT /SERVER=${serverUrl} /TOKEN=${token}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("pt-BR");
}

function describeToken(token: EnrollmentToken): string {
  const uses =
    token.usageCount === 1 ? "1 instalação" : `${token.usageCount} instalações`;
  const validity = token.expiresAt
    ? `válido até ${formatDate(token.expiresAt)}`
    : "sem validade";

  return `Criado em ${formatDate(token.createdAt)} · ${uses} · ${validity}`;
}

function describeClient(client: Client): string {
  const pcs = client.endpointCount === 1 ? "1 PC" : `${client.endpointCount} PCs`;
  const tokens =
    client.activeTokenCount === 1
      ? "1 token ativo"
      : `${client.activeTokenCount} tokens ativos`;

  return `${pcs} · ${tokens}`;
}

interface ClientsSectionProps {
  clients: Client[];
  loading: boolean;
  error: string | null;
  onCreateClient: (name: string) => Promise<Client>;
  onChanged: () => Promise<void> | void;
  // PCs de todos os clientes; a página mostra os do cliente selecionado.
  endpoints?: Endpoint[];
  health?: EndpointHealth[];
  onRevokeEndpoint?: (endpointId: number) => Promise<void>;
}

const NO_ENDPOINTS: Endpoint[] = [];
const NO_HEALTH: EndpointHealth[] = [];

const ENDPOINT_STATUS_BADGES: Record<EndpointStatus, { label: string; className: string }> = {
  ONLINE: { label: "Online", className: "bg-emerald-500/10 text-emerald-400" },
  ALERT: { label: "Alerta", className: "bg-amber-500/10 text-amber-400" },
  OFFLINE: { label: "Offline", className: "bg-rose-500/10 text-rose-400" },
};

export function dashboardLinkForClient(clientId: number): string {
  return `${ROUTES.dashboard}?${CLIENT_FILTER_PARAM}=${clientFilterToUrlValue(clientId)}`;
}

function describeEndpoint(endpoint: Endpoint): string {
  return [
    endpoint.ipAddress,
    endpoint.agentVersion ? `Agente ${endpoint.agentVersion}` : undefined,
    endpoint.lastSeenAt
      ? `Visto em ${new Date(endpoint.lastSeenAt).toLocaleString("pt-BR")}`
      : undefined,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function ClientsSection({
  clients,
  loading,
  error,
  onCreateClient,
  onChanged,
  endpoints = NO_ENDPOINTS,
  health = NO_HEALTH,
  onRevokeEndpoint,
}: ClientsSectionProps) {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedClient =
    clients.find((client) => client.id === selectedClientId) ??
    clients[0] ??
    null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setFormError("Informe um nome entre 2 e 100 caracteres.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);

      const client = await onCreateClient(trimmed);

      setName("");
      setSelectedClientId(client.id);
    } catch (createError) {
      setFormError(describeClientError(createError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-label="Clientes" className="min-w-0">

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="min-w-0 io-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <form onSubmit={handleSubmit} className="flex gap-2" noValidate>
            <label htmlFor="new-client-name" className="sr-only">
              Nome do cliente
            </label>

            <input
              id="new-client-name"
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do cliente"
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-cyan-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-cyan-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
            >
              <Plus size={16} aria-hidden="true" />
              Adicionar
            </button>
          </form>

          {formError && (
            <p role="alert" className="mt-2 text-xs text-rose-400">
              {formError}
            </p>
          )}

          <div className="mt-5">
            {loading && clients.length === 0 ? (
              <p className="text-sm text-slate-400">Carregando clientes...</p>
            ) : error ? (
              <p className="text-sm text-rose-400">{error}</p>
            ) : clients.length === 0 ? (
              <EmptyState
                title="Nenhum cliente cadastrado"
                description="Cadastre um cliente para gerar o token de instalação dos PCs dele."
              />
            ) : (
              <ul className="space-y-2" aria-label="Lista de clientes">
                {clients.map((client) => (
                  <li key={client.id}>
                    <button
                      type="button"
                      aria-pressed={client.id === selectedClient?.id}
                      onClick={() => setSelectedClientId(client.id)}
                      className={`flex w-full min-w-0 items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                        client.id === selectedClient?.id
                          ? "border-cyan-500/60 bg-cyan-500/10"
                          : "border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <Building2 size={18} className="shrink-0 text-slate-400" aria-hidden="true" />

                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-100">
                          {client.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {describeClient(client)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {selectedClient ? (
          <div className="min-w-0 space-y-4">
            <ClientEndpointsPanel
              client={selectedClient}
              endpoints={endpoints.filter(
                (endpoint) => endpoint.client?.id === selectedClient.id,
              )}
              health={health}
              onRevokeEndpoint={onRevokeEndpoint}
            />

            <ClientDirectoriesPanel
              key={`directories-${selectedClient.id}`}
              client={selectedClient}
            />

            <EnrollmentTokensPanel
              key={selectedClient.id}
              client={selectedClient}
              onChanged={onChanged}
            />
          </div>
        ) : (
          <div className="min-w-0 io-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <EmptyState
              title="Nenhum cliente selecionado"
              description="Os tokens de instalação aparecem aqui."
            />
          </div>
        )}
      </div>
    </section>
  );
}

interface ClientEndpointsPanelProps {
  client: Client;
  endpoints: Endpoint[];
  health: EndpointHealth[];
  onRevokeEndpoint?: (endpointId: number) => Promise<void>;
}

// PCs do cliente selecionado, com status e revogação de acesso.
function ClientEndpointsPanel({
  client,
  endpoints,
  health,
  onRevokeEndpoint,
}: ClientEndpointsPanelProps) {
  return (
    <div className="min-w-0 io-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="min-w-0 truncate text-sm font-semibold text-slate-200">
          PCs · {client.name}
        </h4>

        {endpoints.length > 0 && (
          <Link
            to={dashboardLinkForClient(client.id)}
            className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
          >
            Ver no painel
          </Link>
        )}
      </div>

      {endpoints.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="Nenhum PC instalado"
            description="Gere um token de instalação e use no instalador dos PCs deste cliente."
          />
        </div>
      ) : (
        <ul
          className="mt-3 divide-y divide-slate-800"
          aria-label={`PCs do cliente ${client.name}`}
        >
          {endpoints.map((endpoint) => {
            const id = Number(endpoint.id);
            const status = health.find((item) => item.endpointId === id)?.status ?? "OFFLINE";
            const badge = ENDPOINT_STATUS_BADGES[status];

            return (
              <li
                key={endpoint.id}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <Monitor size={18} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-100">
                        {endpoint.hostname}
                      </span>

                      <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {describeEndpoint(endpoint)}
                    </p>
                  </div>
                </div>

                {endpoint.credentialRevokedAt ? (
                  <span className="w-fit shrink-0 rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-400">
                    Acesso revogado em{" "}
                    {new Date(endpoint.credentialRevokedAt).toLocaleDateString("pt-BR")}
                  </span>
                ) : (
                  onRevokeEndpoint && (
                    <RevokeAccessButton
                      hostname={endpoint.hostname}
                      onConfirm={() => onRevokeEndpoint(id)}
                    />
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface EnrollmentTokensPanelProps {
  client: Client;
  onChanged: () => Promise<void> | void;
}

function EnrollmentTokensPanel({ client, onChanged }: EnrollmentTokensPanelProps) {
  const [tokens, setTokens] = useState<EnrollmentToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validityIndex, setValidityIndex] = useState(0);
  const [created, setCreated] = useState<CreatedEnrollmentToken | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmingTokenId, setConfirmingTokenId] = useState<number | null>(null);

  const loadTokens = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setTokens(await clientsService.getEnrollmentTokens(client.id));
    } catch {
      setError("Não foi possível carregar os tokens.");
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    void loadTokens();
  }, [loadTokens]);

  async function handleGenerate() {
    try {
      setBusy(true);
      setError(null);

      const result = await clientsService.createEnrollmentToken(
        client.id,
        TOKEN_VALIDITY_OPTIONS[validityIndex].days,
      );

      setCreated(result);
      await Promise.all([loadTokens(), onChanged()]);
    } catch {
      setError("Não foi possível gerar o token.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke(tokenId: number) {
    try {
      setBusy(true);
      setError(null);
      await clientsService.revokeEnrollmentToken(client.id, tokenId);

      if (created?.enrollmentToken.id === tokenId) {
        setCreated(null);
      }

      setConfirmingTokenId(null);
      await Promise.all([loadTokens(), onChanged()]);
    } catch {
      setError("Não foi possível revogar o token.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 io-card rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="min-w-0 truncate text-sm font-semibold text-slate-200">
          Tokens de instalação · {client.name}
        </h4>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="token-validity" className="text-xs text-slate-400">
            Validade
          </label>

          <select
            id="token-validity"
            value={validityIndex}
            onChange={(event) => setValidityIndex(Number(event.target.value))}
            className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-200 outline-none focus:border-cyan-500"
          >
            {TOKEN_VALIDITY_OPTIONS.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
          >
            <KeyRound size={14} aria-hidden="true" />
            Gerar token
          </button>
        </div>
      </div>

      {created && <CreatedTokenNotice created={created} />}

      {error && (
        <p role="alert" className="mt-3 text-xs text-rose-400">
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading && tokens.length === 0 ? (
          <p className="text-sm text-slate-400">Carregando tokens...</p>
        ) : tokens.length === 0 ? (
          <EmptyState
            title="Nenhum token gerado"
            description="Gere um token e use no instalador dos PCs deste cliente."
          />
        ) : (
          <ul className="divide-y divide-slate-800" aria-label="Tokens de instalação">
            {tokens.map((token) => {
              const status = enrollmentTokenStatus(token);
              const badge = TOKEN_STATUS_BADGES[status];

              return (
                <li
                  key={token.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="truncate text-sm text-slate-200">
                        {token.prefix}…
                      </code>

                      <span className={`rounded-full px-2 py-0.5 text-xs ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {describeToken(token)}
                    </p>
                  </div>

                  {status === "active" &&
                    (confirmingTokenId === token.id ? (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void handleRevoke(token.id)}
                          className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-50"
                        >
                          Confirmar revogação
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmingTokenId(null)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {token.revealable ? (
                          <>
                            <RevealCopyButton
                              label="Copiar token"
                              ariaLabel={`Copiar o token ${token.prefix}`}
                              reveal={() => clientsService.revealEnrollmentToken(client.id, token.id)}
                            />

                            <RevealCopyButton
                              label="Copiar comando"
                              ariaLabel={`Copiar o comando de instalação do token ${token.prefix}`}
                              reveal={async () =>
                                silentInstallCommand(
                                  getServerUrl(),
                                  await clientsService.revealEnrollmentToken(client.id, token.id),
                                )
                              }
                            />
                          </>
                        ) : (
                          <span
                            className="text-xs text-slate-500"
                            title="Tokens gerados antes da v1.8.0 não podem ser copiados de novo. Gere um token novo para continuar instalando."
                          >
                            Não pode ser copiado
                          </span>
                        )}

                        <button
                          type="button"
                          aria-label={`Revogar o token ${token.prefix}`}
                          onClick={() => setConfirmingTokenId(token.id)}
                          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-rose-500/60 hover:text-rose-400"
                        >
                          Revogar
                        </button>
                      </div>
                    ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Revogar um token impede novas instalações com ele. Os PCs que já
        entraram continuam enviando dados; para cortar um PC, use “Revogar
        acesso” na lista de PCs acima.
      </p>
    </div>
  );
}

function CreatedTokenNotice({ created }: { created: CreatedEnrollmentToken }) {
  const command = silentInstallCommand(getServerUrl(), created.token);

  return (
    <div
      role="status"
      className="mt-4 space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4"
    >
      <p className="text-xs font-medium text-amber-300">
        Token gerado. Ele serve para todos os PCs deste cliente e pode ser
        copiado de novo pela lista enquanto estiver ativo.
      </p>

      <CopyField label="Token de instalação" value={created.token} />
      <CopyField label="Instalação silenciosa (como administrador; ajuste o nome do arquivo baixado)" value={command} />
    </div>
  );
}

const COPIED_FEEDBACK_MS = 2000;

interface RevealCopyButtonProps {
  label: string;
  ariaLabel: string;
  reveal: () => Promise<string>;
}

// Busca o token no servidor só no clique e copia; o valor não fica na tela.
function RevealCopyButton({ label, ariaLabel, reveal }: RevealCopyButtonProps) {
  const [state, setState] = useState<"idle" | "busy" | "copied" | "error">("idle");

  async function handleClick() {
    try {
      setState("busy");
      await navigator.clipboard.writeText(await reveal());
      setState("copied");
      globalThis.setTimeout(() => setState("idle"), COPIED_FEEDBACK_MS);
    } catch {
      setState("error");
    }
  }

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={state === "busy"}
      onClick={() => void handleClick()}
      className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-400 disabled:opacity-50"
    >
      {state === "copied" ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      {state === "copied" ? "Copiado" : state === "error" ? "Falhou, tente de novo" : label}
    </button>
  );
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs text-slate-400">{label}</p>

      <div className="flex min-w-0 items-start gap-2">
        <code className="min-w-0 flex-1 break-all rounded-lg bg-slate-950 px-3 py-2 text-xs text-slate-200">
          {value}
        </code>

        <button
          type="button"
          aria-label={`Copiar: ${label}`}
          onClick={() => void handleCopy()}
          className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-700 px-2 py-2 text-xs text-slate-300 hover:border-cyan-500/60 hover:text-cyan-400"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copied ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
}
