import { FolderOpen, FolderX } from "lucide-react";
import { useState } from "react";

import type {
  EndpointDirectoriesInput,
  MonitoredDirectories,
} from "../services/monitoredDirectoriesService";
import { DirectoryListEditor } from "./DirectoryListEditor";

interface MonitoredDirectoriesPanelProps {
  hostname: string;
  directories: MonitoredDirectories | null;
  loading: boolean;
  error: string | null;
  onSave: (input: EndpointDirectoriesInput) => Promise<void>;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// De onde vêm as pastas deste PC, em uma frase.
export function describeSource(directories: MonitoredDirectories, hostname: string): string {
  const { source } = directories.effective;

  if (source === "endpoint") {
    return `Lista própria de ${hostname}.`;
  }

  if (source === "client" && directories.client) {
    return `Seguindo o cliente ${directories.client.name}.`;
  }

  return `Pastas da instalação do agente de ${hostname}.`;
}

// RF10: ver e escolher, pelo dashboard, as pastas que o agente de um PC monitora.
// O PC segue a configuração do cliente ou tem uma lista própria (por exemplo,
// o servidor de arquivos).
export function MonitoredDirectoriesPanel({
  hostname,
  directories,
  loading,
  error,
  onSave,
}: MonitoredDirectoriesPanelProps) {
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"inherit" | "custom">("inherit");
  const [draft, setDraft] = useState<string[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const followLabel = directories?.client
    ? `Seguir o cliente ${directories.client.name}`
    : "Usar as pastas da instalação do agente";

  function startEditing() {
    if (!directories) {
      return;
    }

    setMode(directories.mode);
    // Começa da lista própria ou, sem ela, do que o agente monitora hoje.
    setDraft(
      directories.mode === "custom"
        ? directories.configuredDirectories
        : directories.monitoredDirectories,
    );
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    try {
      setSaving(true);
      setSaveError(null);
      await onSave({ mode, directories: mode === "custom" ? draft : [] });
      setEditing(false);
    } catch {
      setSaveError("Não foi possível salvar as pastas. Confira os caminhos e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="directories-heading"
      className="io-card mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3 id="directories-heading" className="text-sm font-semibold text-slate-200">
            Pastas monitoradas
          </h3>

          {directories && (
            <p className="mt-1 text-xs text-slate-500">
              {describeSource(directories, hostname)}
            </p>
          )}
        </div>

        {!editing && directories && (
          <button
            type="button"
            onClick={startEditing}
            className="w-fit rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-300"
          >
            Editar pastas
          </button>
        )}
      </div>

      {loading && !directories && (
        <p className="mt-4 text-sm text-slate-400">Carregando pastas...</p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-rose-400">
          {error}
        </p>
      )}

      {directories && !editing && <AppliedDirectories directories={directories} />}

      {directories && editing && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-xs font-medium text-slate-300">
              De onde vêm as pastas deste PC
            </legend>

            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="endpoint-directories-mode"
                  checked={mode === "inherit"}
                  onChange={() => setMode("inherit")}
                  className="accent-cyan-500"
                />
                {followLabel}
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="endpoint-directories-mode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                  className="accent-cyan-500"
                />
                Lista própria deste PC
              </label>
            </div>
          </fieldset>

          {mode === "custom" && (
            <DirectoryListEditor
              directories={draft}
              onChange={setDraft}
              emptyMessage="Lista vazia: este PC não monitora pastas, só envia métricas."
            />
          )}

          <p className="text-xs text-slate-500">
            O agente aplica a mudança em até 1 minuto e liga a auditoria do Windows nas pastas novas.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Salvar pastas
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600 disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>

          {saveError && (
            <p role="alert" className="text-xs text-rose-400">
              {saveError}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function AppliedDirectories({ directories }: { directories: MonitoredDirectories }) {
  const watchesNothing =
    directories.effective.source !== "installation" &&
    directories.effective.directories.length === 0;

  return (
    <div className="mt-4 space-y-3">
      {directories.pending && (
        <p
          role="status"
          className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300"
        >
          Aguardando o agente aplicar a mudança. Ele confere a configuração a cada minuto.
        </p>
      )}

      {directories.monitoredDirectories.length > 0 ? (
        <ul aria-label="Monitorando agora" className="space-y-2">
          {directories.monitoredDirectories.map((path) => (
            <li key={path} className="flex items-center gap-2 text-xs text-slate-200">
              <FolderOpen size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
              <span className="min-w-0 break-all font-mono">{path}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400">
          {!directories.reportedAt
            ? "O agente ainda não informou as pastas. Agentes anteriores à versão 1.11.0 não recebem esta configuração."
            : watchesNothing
              ? "Nenhuma pasta monitorada: este PC só envia métricas."
              : "O agente informou que não está monitorando nenhuma pasta."}
        </p>
      )}

      {directories.missingDirectories.length > 0 && (
        <div>
          <p className="text-xs font-medium text-amber-300">Não encontradas no PC</p>

          <ul aria-label="Pastas não encontradas" className="mt-1 space-y-1">
            {directories.missingDirectories.map((path) => (
              <li key={path} className="flex items-center gap-2 text-xs text-slate-400">
                <FolderX size={14} className="shrink-0 text-amber-400" aria-hidden="true" />
                <span className="min-w-0 break-all font-mono">{path}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {directories.reportedAt && (
        <p className="text-xs text-slate-500">
          Informado pelo agente em {formatDateTime(directories.reportedAt)}.
        </p>
      )}
    </div>
  );
}
