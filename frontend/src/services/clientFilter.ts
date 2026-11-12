// Filtro do dashboard por cliente. Fica na URL (?cliente=3 ou ?cliente=sem),
// para recarregar a página ou mandar o link já filtrado.
export const CLIENT_FILTER_PARAM = "cliente";
export const CLIENT_FILTER_NONE = "none";
// Valor na URL para "PCs sem cliente" (mais claro que "none" para quem lê).
const NONE_URL_VALUE = "sem";

// número = id do cliente; "none" = PCs sem cliente; undefined = todos.
export type ClientFilter = number | typeof CLIENT_FILTER_NONE;

export function parseClientFilter(
  value: string | null | undefined,
): ClientFilter | undefined {
  if (!value) {
    return undefined;
  }

  if (value === NONE_URL_VALUE) {
    return CLIENT_FILTER_NONE;
  }

  const id = Number(value);

  return Number.isInteger(id) && id > 0 ? id : undefined;
}

export function clientFilterToUrlValue(filter: ClientFilter): string {
  return filter === CLIENT_FILTER_NONE ? NONE_URL_VALUE : String(filter);
}

// Parâmetro da API (clientId=3 ou clientId=none); vazio sem filtro.
export function clientFilterQuery(filter: ClientFilter | undefined): string {
  return filter === undefined ? "" : `clientId=${filter}`;
}

// Junta o filtro a um caminho que pode já ter parâmetros.
export function withClientFilter(
  path: string,
  filter: ClientFilter | undefined,
): string {
  const query = clientFilterQuery(filter);

  if (!query) {
    return path;
  }

  return `${path}${path.includes("?") ? "&" : "?"}${query}`;
}
