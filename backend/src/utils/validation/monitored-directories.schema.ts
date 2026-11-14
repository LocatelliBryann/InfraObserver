import { z } from "zod";

// RF10: pastas monitoradas definidas pelo dashboard.
export const MAX_CONFIGURED_DIRECTORIES = 20;
// O agente pode informar mais pastas do que o dashboard configura (as
// padrão do usuário, por exemplo).
export const MAX_REPORTED_DIRECTORIES = 50;
// Limite clássico de caminho do Windows (MAX_PATH).
export const MAX_PATH_LENGTH = 260;

// Caminho absoluto do Windows: C:\pasta ou \\servidor\compartilhamento.
// Sem caracteres de controle nem os proibidos em nomes (" < > | ? *).
const DRIVE_PATH = /^[A-Za-z]:\\/;
const UNC_PATH = /^\\\\[^\\]+\\[^\\]+/;
const FORBIDDEN = /[\u0000-\u001f"<>|?*]/;

// Tira barras do fim (C:\Dados\ vira C:\Dados), mas mantém a raiz (C:\).
export function normalizeDirectory(path: string): string {
  const trimmed = path.trim();

  if (/^[A-Za-z]:\\$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed.replace(/\\+$/, "");
}

const directoryPathSchema = z
  .string()
  .trim()
  .min(1, "Informe o caminho da pasta")
  .max(MAX_PATH_LENGTH, `O caminho pode ter no máximo ${MAX_PATH_LENGTH} caracteres`)
  .refine((path) => DRIVE_PATH.test(path) || UNC_PATH.test(path), {
    message: "Use um caminho completo, como C:\\Dados ou \\\\servidor\\pasta",
  })
  // Fora o ":" da unidade, o caminho não pode ter caracteres proibidos.
  .refine((path) => !FORBIDDEN.test(path) && !path.slice(2).includes(":"), {
    message: "O caminho tem caracteres que o Windows não aceita",
  })
  .transform(normalizeDirectory);

// Sem repetidas: o Windows não diferencia maiúsculas de minúsculas.
function uniqueIgnoringCase(paths: string[]): string[] {
  const seen = new Set<string>();

  return paths.filter((path) => {
    const key = path.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

const directoryListSchema = z
  .array(directoryPathSchema)
  .max(MAX_CONFIGURED_DIRECTORIES, `No máximo ${MAX_CONFIGURED_DIRECTORIES} pastas`)
  .transform(uniqueIgnoringCase);

// PUT /api/v1/endpoints/:id/monitored-directories (dashboard).
// inherit: o PC segue o cliente. custom: lista própria (vazia = nenhuma pasta).
export const endpointDirectoriesSchema = z
  .object({
    mode: z.enum(["inherit", "custom"]),
    directories: directoryListSchema.default([]),
  })
  .transform(({ mode, directories }) => ({
    mode,
    // Seguindo o cliente, a lista própria não vale e não é guardada.
    directories: mode === "custom" ? directories : [],
  }));

// PUT /api/v1/clients/:clientId/monitored-directories (dashboard).
// installation: cada PC com as pastas da instalação. custom: a lista do
// cliente para todos os PCs sem lista própria (vazia = nenhuma pasta).
export const clientDirectoriesSchema = z
  .object({
    mode: z.enum(["installation", "custom"]),
    directories: directoryListSchema.default([]),
  })
  .transform(({ mode, directories }) => ({
    mode,
    directories: mode === "custom" ? directories : [],
  }));

// O que o agente informa: só textos de tamanho razoável. Não precisa ser um
// caminho válido do Windows (o agente roda também fora dele, em teste).
const reportedPathSchema = z.string().min(1).max(MAX_PATH_LENGTH);

// POST /api/v1/agents/:agentId/config/status (agente).
export const directoriesReportSchema = z.object({
  monitoredDirectories: z.array(reportedPathSchema).max(MAX_REPORTED_DIRECTORIES),
  missingDirectories: z.array(reportedPathSchema).max(MAX_REPORTED_DIRECTORIES),
});

export const agentIdParamSchema = z.string().uuid();

export type EndpointDirectoriesInput = z.infer<typeof endpointDirectoriesSchema>;
export type ClientDirectoriesInput = z.infer<typeof clientDirectoriesSchema>;
export type DirectoriesReportInput = z.infer<typeof directoriesReportSchema>;
