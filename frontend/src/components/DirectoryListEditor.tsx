import { Plus, X } from "lucide-react";
import { useId, type FormEvent } from "react";

import type { DirectoryDraft } from "../hooks/useDirectoryDraft";

interface DirectoryListEditorProps {
  draft: DirectoryDraft;
  // Texto quando a lista está vazia (o que acontece se salvar assim).
  emptyMessage: string;
}

// Lista de pastas editável, com a mesma validação do backend.
export function DirectoryListEditor({ draft, emptyMessage }: DirectoryListEditorProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const { directories, input, error } = draft;

  function addPath(event: FormEvent) {
    event.preventDefault();
    draft.add();
  }

  return (
    <div>
      {directories.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyMessage}</p>
      ) : (
        <ul aria-label="Pastas a monitorar" className="space-y-2">
          {directories.map((path) => (
            <li
              key={path}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"
            >
              <span className="min-w-0 break-all font-mono text-xs text-slate-200">
                {path}
              </span>

              <button
                type="button"
                aria-label={`Remover ${path}`}
                onClick={() => draft.remove(path)}
                className="shrink-0 rounded p-1 text-slate-500 hover:text-rose-400"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addPath} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={inputId} className="sr-only">
          Caminho da pasta
        </label>

        <input
          id={inputId}
          value={input}
          onChange={(event) => draft.setInput(event.target.value)}
          placeholder="D:\Compartilhado\Escrituras ou \\servidor\pasta"
          aria-invalid={error !== null}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 font-mono text-xs text-slate-100 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
        />

        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-200 hover:border-cyan-500/60 hover:text-cyan-300"
        >
          <Plus size={14} />
          Adicionar
        </button>
      </form>

      {error && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
}
