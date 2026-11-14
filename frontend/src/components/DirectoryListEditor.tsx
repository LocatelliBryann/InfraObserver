import { Plus, X } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import {
  MAX_DIRECTORIES,
  validateDirectory,
} from "../services/monitoredDirectoriesService";

interface DirectoryListEditorProps {
  directories: string[];
  onChange: (directories: string[]) => void;
  // Texto quando a lista está vazia (o que acontece se salvar assim).
  emptyMessage: string;
}

function sameIgnoringCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

// Lista de pastas editável, com a mesma validação do backend.
export function DirectoryListEditor({
  directories,
  onChange,
  emptyMessage,
}: DirectoryListEditorProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [newPath, setNewPath] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  function addPath(event: FormEvent) {
    event.preventDefault();

    const path = newPath.trim();
    const problem = validateDirectory(path);

    if (problem) {
      setInputError(problem);
      return;
    }

    if (directories.some((item) => sameIgnoringCase(item, path))) {
      setInputError("Essa pasta já está na lista.");
      return;
    }

    if (directories.length >= MAX_DIRECTORIES) {
      setInputError(`No máximo ${MAX_DIRECTORIES} pastas.`);
      return;
    }

    onChange([...directories, path]);
    setNewPath("");
    setInputError(null);
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
                onClick={() => onChange(directories.filter((item) => item !== path))}
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
          value={newPath}
          onChange={(event) => {
            setNewPath(event.target.value);
            setInputError(null);
          }}
          placeholder="D:\Compartilhado\Escrituras ou \\servidor\pasta"
          aria-invalid={inputError !== null}
          aria-describedby={inputError ? errorId : undefined}
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

      {inputError && (
        <p id={errorId} role="alert" className="mt-2 text-xs text-rose-400">
          {inputError}
        </p>
      )}
    </div>
  );
}
