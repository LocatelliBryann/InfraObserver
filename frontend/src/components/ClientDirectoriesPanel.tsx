import { FolderOpen } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type { Client } from "../services/clientsService";
import {
  monitoredDirectoriesService,
  type ClientDirectories,
} from "../services/monitoredDirectoriesService";
import { DirectoryListEditor } from "./DirectoryListEditor";

interface ClientDirectoriesPanelProps {
  client: Client;
}

function describeOverrides(count: number): string | null {
  if (count === 0) {
    return null;
  }

  return count === 1
    ? "1 PC deste cliente tem lista própria e não segue esta configuração."
    : `${count} PCs deste cliente têm lista própria e não seguem esta configuração.`;
}

// RF10: uma configuração de pastas para todos os PCs do cliente, inclusive os
// que forem instalados depois. Um PC pode ter lista própria (no dashboard,
// em "Pastas monitoradas" do PC), como o servidor de arquivos.
export function ClientDirectoriesPanel({ client }: ClientDirectoriesPanelProps) {
  const [directories, setDirectories] = useState<ClientDirectories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"installation" | "custom">("installation");
  const [draft, setDraft] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setDirectories(await monitoredDirectoriesService.getClient(client.id));
      setError(null);
    } catch {
      setError("Não foi possível carregar as pastas do cliente.");
    } finally {
      setLoading(false);
    }
  }, [client.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function startEditing() {
    if (!directories) {
      return;
    }

    setMode(directories.mode);
    setDraft(directories.directories);
    setSaveError(null);
    setEditing(true);
  }

  async function save() {
    try {
      setSaving(true);
      setSaveError(null);
      setDirectories(
        await monitoredDirectoriesService.saveClient(client.id, {
          mode,
          directories: mode === "custom" ? draft : [],
        }),
      );
      setEditing(false);
    } catch {
      setSaveError("Não foi possível salvar as pastas. Confira os caminhos e tente de novo.");
    } finally {
      setSaving(false);
    }
  }

  const overrides = directories ? describeOverrides(directories.customEndpointCount) : null;

  return (
    <section
      aria-labelledby="client-directories-heading"
      className="io-card rounded-2xl border border-slate-800 bg-slate-900 p-5"
    >
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h3
            id="client-directories-heading"
            className="text-sm font-semibold text-slate-200"
          >
            Pastas monitoradas dos PCs
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            Vale para todos os PCs de {client.name}, inclusive os instalados depois.
          </p>
        </div>

        {!editing && directories && (
          <button
            type="button"
            onClick={startEditing}
            className="w-fit rounded-lg border border-slate-700 px-3 py-1 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-cyan-300"
          >
            Editar pastas do cliente
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

      {directories && !editing && (
        <div className="mt-4 space-y-2">
          {directories.mode === "installation" ? (
            <p className="text-sm text-slate-400">
              Cada PC monitora as pastas definidas na instalação do agente.
            </p>
          ) : directories.directories.length === 0 ? (
            <p className="text-sm text-slate-400">
              Nenhuma pasta: os PCs só enviam métricas.
            </p>
          ) : (
            <ul aria-label={`Pastas do cliente ${client.name}`} className="space-y-2">
              {directories.directories.map((path) => (
                <li key={path} className="flex items-center gap-2 text-xs text-slate-200">
                  <FolderOpen size={14} className="shrink-0 text-emerald-400" aria-hidden="true" />
                  <span className="min-w-0 break-all font-mono">{path}</span>
                </li>
              ))}
            </ul>
          )}

          {overrides && <p className="text-xs text-slate-500">{overrides}</p>}
        </div>
      )}

      {directories && editing && (
        <div className="mt-4 space-y-4">
          <fieldset>
            <legend className="text-xs font-medium text-slate-300">
              Pastas dos PCs de {client.name}
            </legend>

            <div className="mt-2 flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="client-directories-mode"
                  checked={mode === "installation"}
                  onChange={() => setMode("installation")}
                  className="accent-cyan-500"
                />
                Pastas da instalação de cada PC
              </label>

              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="radio"
                  name="client-directories-mode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                  className="accent-cyan-500"
                />
                Mesma lista para todos os PCs
              </label>
            </div>
          </fieldset>

          {mode === "custom" && (
            <DirectoryListEditor
              directories={draft}
              onChange={setDraft}
              emptyMessage="Lista vazia: os PCs não monitoram pastas, só enviam métricas."
            />
          )}

          <p className="text-xs text-slate-500">
            Para saber quem mexe nos compartilhamentos de rede, instale o agente no servidor de
            arquivos e dê a ele uma lista própria com as pastas compartilhadas.
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              Salvar para o cliente
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
