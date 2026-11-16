import { useState } from "react";

import {
  MAX_DIRECTORIES,
  validateDirectory,
} from "../services/monitoredDirectoriesService";

export interface DirectoryDraft {
  directories: string[];
  // Texto digitado no campo e ainda não adicionado à lista.
  input: string;
  error: string | null;
  setInput: (value: string) => void;
  reset: (directories: string[]) => void;
  add: () => void;
  remove: (path: string) => void;
  // Lista final para salvar. Um caminho que ficou no campo entra nela;
  // se ele for inválido, devolve null e mostra o erro.
  commit: () => string[] | null;
}

function sameIgnoringCase(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function problemWith(directories: string[], path: string): string | null {
  const problem = validateDirectory(path);

  if (problem) {
    return problem;
  }

  if (directories.some((item) => sameIgnoringCase(item, path))) {
    return "Essa pasta já está na lista.";
  }

  if (directories.length >= MAX_DIRECTORIES) {
    return `No máximo ${MAX_DIRECTORIES} pastas.`;
  }

  return null;
}

// Rascunho da lista de pastas, compartilhado pelo painel do PC e o do cliente.
export function useDirectoryDraft(): DirectoryDraft {
  const [directories, setDirectories] = useState<string[]>([]);
  const [input, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  function addInput(): string[] | null {
    const path = input.trim();
    const problem = problemWith(directories, path);

    if (problem) {
      setError(problem);
      return null;
    }

    const next = [...directories, path];
    setDirectories(next);
    setInputValue("");
    setError(null);
    return next;
  }

  return {
    directories,
    input,
    error,
    setInput: (value) => {
      setInputValue(value);
      setError(null);
    },
    reset: (next) => {
      setDirectories(next);
      setInputValue("");
      setError(null);
    },
    add: () => {
      addInput();
    },
    remove: (path) => {
      setDirectories(directories.filter((item) => item !== path));
    },
    commit: () => (input.trim() === "" ? directories : addInput()),
  };
}
